import { integrationService } from "@/src/modules/integration";
import { inventoryService } from "@/src/modules/inventory";
import { getChannelAdapter, isOtaProviderKey } from "../domain/adapters/registry";
import type { AriDelta } from "../domain/adapter";
import {
  enqueueSyncSchema,
  ingestReservationSchema,
  upsertMappingSchema,
} from "../domain/validate";
import type {
  ChannelReservationView,
  ChannelRoomMappingView,
  ChannelSyncJobView,
} from "../domain/types";
import { channelRepository } from "../repository/channel.repository";

export class ChannelNotFoundError extends Error {
  constructor(message = "Topilmadi") {
    super(message);
    this.name = "ChannelNotFoundError";
  }
}

/**
 * Channel manager façade (Cloudbeds/SiteMinder pattern):
 * 1) Connect OTA via integration module
 * 2) Map room/rate codes
 * 3) Enqueue ARI / reservation jobs (adapter runs OUTSIDE DB tx)
 * 4) Idempotent reservation inbox → later booking.create
 */
export class ChannelService {
  async listMappings(
    hotelId: string,
    providerKey?: string,
  ): Promise<ChannelRoomMappingView[]> {
    return channelRepository.listMappings(hotelId, providerKey);
  }

  async upsertMapping(
    hotelId: string,
    raw: unknown,
  ): Promise<ChannelRoomMappingView> {
    const parsed = upsertMappingSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid mapping: ${parsed.error.message}`);
    }
    const d = parsed.data;
    return channelRepository.upsertMapping({
      hotelId,
      providerKey: d.providerKey,
      roomTypeId: d.roomTypeId,
      externalRoomCode: d.externalRoomCode,
      // Empty string (not null) so MySQL unique index is reliable.
      externalRateCode: d.externalRateCode?.trim() || "",
      active: d.active ?? true,
    });
  }

  async deleteMapping(hotelId: string, id: string): Promise<void> {
    const ok = await channelRepository.deleteMapping(hotelId, id);
    if (!ok) throw new ChannelNotFoundError("Mapping topilmadi");
  }

  async listJobs(hotelId: string): Promise<ChannelSyncJobView[]> {
    return channelRepository.listJobs(hotelId);
  }

  async enqueueSync(
    hotelId: string,
    raw: unknown,
  ): Promise<ChannelSyncJobView> {
    const parsed = enqueueSyncSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid sync: ${parsed.error.message}`);
    }
    await integrationService.requireConnectedOta(
      hotelId,
      parsed.data.providerKey,
    );
    return channelRepository.createJob({
      hotelId,
      providerKey: parsed.data.providerKey,
      kind: parsed.data.kind,
    });
  }

  /**
   * Process one queued job. External adapter I/O happens here —
   * never inside a Prisma transaction.
   */
  async processJob(
    hotelId: string,
    jobId: string,
  ): Promise<ChannelSyncJobView> {
    const job = await channelRepository.getJob(hotelId, jobId);
    if (!job) throw new ChannelNotFoundError("Sync job topilmadi");
    if (job.status !== "QUEUED") return job;

    const claimed = await channelRepository.claimQueued(jobId);
    if (!claimed) {
      const current = await channelRepository.getJob(hotelId, jobId);
      if (!current) throw new ChannelNotFoundError("Sync job topilmadi");
      return current;
    }

    try {
      if (!isOtaProviderKey(job.providerKey)) {
        throw new Error(`Not an OTA provider: ${job.providerKey}`);
      }
      const conn = await integrationService.requireConnectedOta(
        hotelId,
        job.providerKey,
      );
      const adapter = getChannelAdapter(job.providerKey);

      if (adapter.mode === "dry_run") {
        const resultJson = {
          dryRun: true,
          live: false,
          kind: job.kind,
          message:
            "OpenTravel adapter ulanmagan. Mavjudlik va bronlar tashqi kanalga yuborilmadi.",
        };
        await integrationService.markSync(hotelId, job.providerKey, {
          ok: true,
        });
        return channelRepository.updateJob(jobId, {
          status: "SUCCEEDED",
          errorMessage: null,
          resultJson,
          finishedAt: new Date(),
        });
      }

      let resultJson: Record<string, unknown> = {};

      if (job.kind === "RESERVATION_PULL") {
        const pulled = await adapter.pullReservations({
          externalHotelId: conn.externalHotelId,
        });
        for (const r of pulled.reservations) {
          await channelRepository.ingestReservation({
            hotelId,
            providerKey: job.providerKey,
            externalReservationId: r.externalReservationId,
            payload: r.payload,
          });
        }
        resultJson = {
          ...pulled.result,
          pulledCount: pulled.reservations.length,
        };
        await integrationService.markSync(hotelId, job.providerKey, {
          ok: pulled.result.ok,
          error: pulled.result.ok ? undefined : pulled.result.message,
        });
        if (!pulled.result.ok) {
          return channelRepository.updateJob(jobId, {
            status: "FAILED",
            errorMessage: pulled.result.message,
            resultJson,
            finishedAt: new Date(),
          });
        }
      } else {
        // ARI_PUSH / FULL_REFRESH / MAPPING_PULL → push mapped ARI (stub deltas)
        const mappings = await channelRepository.listMappings(
          hotelId,
          job.providerKey,
        );
        const active = mappings.filter((m) => m.active);
        const today = new Date();
        const dateFrom = today.toISOString().slice(0, 10);
        const dateTo = new Date(today.getTime() + 30 * 86400000)
          .toISOString()
          .slice(0, 10);
        const deltas: AriDelta[] = [];
        for (const m of active) {
          const available = await inventoryService.minAvailableRooms(
            m.roomTypeId,
            new Date(`${dateFrom}T00:00:00.000Z`),
            new Date(`${dateTo}T00:00:00.000Z`),
          );
          deltas.push({
            roomTypeId: m.roomTypeId,
            externalRoomCode: m.externalRoomCode,
            externalRateCode: m.externalRateCode,
            dateFrom,
            dateTo,
            allotment: available ?? 0,
          });
        }

        if (job.kind === "FULL_REFRESH") {
          const ping = await adapter.ping({
            externalHotelId: conn.externalHotelId,
            hasCredentials: conn.hasCredentials,
          });
          resultJson.ping = ping;
        }

        const pushed = await adapter.pushAri({
          externalHotelId: conn.externalHotelId,
          deltas,
        });
        resultJson.push = pushed;
        resultJson.mappingCount = active.length;

        await integrationService.markSync(hotelId, job.providerKey, {
          ok: pushed.ok,
          error: pushed.ok ? undefined : pushed.message,
        });

        if (!pushed.ok) {
          return channelRepository.updateJob(jobId, {
            status: "FAILED",
            errorMessage: pushed.message,
            resultJson,
            finishedAt: new Date(),
          });
        }
      }

      return channelRepository.updateJob(jobId, {
        status: "SUCCEEDED",
        errorMessage: null,
        resultJson,
        finishedAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await integrationService.markSync(hotelId, job.providerKey, {
        ok: false,
        error: message,
      });
      return channelRepository.updateJob(jobId, {
        status: "FAILED",
        errorMessage: message,
        finishedAt: new Date(),
      });
    }
  }

  /** Claim and finish due QUEUED jobs. Used by the PM2 cron. */
  async drainDue(limit = 20): Promise<{ due: number; ok: number; failed: number }> {
    const due = await channelRepository.listDueQueued(limit);
    let ok = 0;
    let failed = 0;
    for (const job of due) {
      try {
        const processed = await this.processJob(job.hotelId, job.id);
        if (processed.status === "FAILED") failed += 1;
        else ok += 1;
      } catch (err) {
        failed += 1;
        console.error(`[channel-sync] job ${job.id} failed`, err);
      }
    }
    return { due: due.length, ok, failed };
  }

  /** Enqueue + immediately process (useful for UI "Sinxronlash" button). */
  async syncNow(hotelId: string, raw: unknown): Promise<ChannelSyncJobView> {
    const job = await this.enqueueSync(hotelId, raw);
    return this.processJob(hotelId, job.id);
  }

  async ingestReservation(
    hotelId: string,
    raw: unknown,
  ): Promise<{ view: ChannelReservationView; created: boolean }> {
    const parsed = ingestReservationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid reservation: ${parsed.error.message}`);
    }
    return channelRepository.ingestReservation({
      hotelId,
      providerKey: parsed.data.providerKey,
      externalReservationId: parsed.data.externalReservationId,
      payload: parsed.data.payload,
    });
  }

  async listReservations(hotelId: string): Promise<ChannelReservationView[]> {
    return channelRepository.listReservations(hotelId);
  }

  /** After OTA connect — queue an initial full refresh (Cloudbeds pattern). */
  async onOtaConnected(
    hotelId: string,
    providerKey: string,
  ): Promise<ChannelSyncJobView | null> {
    if (!isOtaProviderKey(providerKey)) return null;
    try {
      await integrationService.requireConnectedOta(hotelId, providerKey);
    } catch {
      return null;
    }
    const job = await channelRepository.createJob({
      hotelId,
      providerKey,
      kind: "FULL_REFRESH",
      payloadJson: { reason: "on_connect" },
    });
    return this.processJob(hotelId, job.id);
  }
}

export const channelService = new ChannelService();
