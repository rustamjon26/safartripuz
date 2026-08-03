import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";
import type {
  ChannelReservationInboxStatus,
  ChannelReservationView,
  ChannelRoomMappingView,
  ChannelSyncJobStatus,
  ChannelSyncJobView,
  ChannelSyncKind,
} from "../domain/types";

function mapMapping(r: {
  id: string;
  hotelId: string;
  providerKey: string;
  roomTypeId: string;
  externalRoomCode: string;
  externalRateCode: string | null;
  active: boolean;
}): ChannelRoomMappingView {
  return {
    id: r.id,
    hotelId: r.hotelId,
    providerKey: r.providerKey,
    roomTypeId: r.roomTypeId,
    externalRoomCode: r.externalRoomCode,
    externalRateCode: r.externalRateCode,
    active: r.active,
  };
}

function mapJob(r: {
  id: string;
  hotelId: string;
  providerKey: string;
  kind: ChannelSyncKind;
  status: ChannelSyncJobStatus;
  attempts: number;
  errorMessage: string | null;
  scheduledAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  resultJson: unknown;
}): ChannelSyncJobView {
  return {
    id: r.id,
    hotelId: r.hotelId,
    providerKey: r.providerKey,
    kind: r.kind,
    status: r.status,
    attempts: r.attempts,
    errorMessage: r.errorMessage,
    scheduledAt: r.scheduledAt.toISOString(),
    startedAt: r.startedAt?.toISOString() ?? null,
    finishedAt: r.finishedAt?.toISOString() ?? null,
    resultJson: r.resultJson,
  };
}

function mapInbox(r: {
  id: string;
  hotelId: string;
  providerKey: string;
  externalReservationId: string;
  status: ChannelReservationInboxStatus;
  hotelBookingId: string | null;
  errorMessage: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}): ChannelReservationView {
  return {
    id: r.id,
    hotelId: r.hotelId,
    providerKey: r.providerKey,
    externalReservationId: r.externalReservationId,
    status: r.status,
    hotelBookingId: r.hotelBookingId,
    errorMessage: r.errorMessage,
    receivedAt: r.receivedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  };
}

export const channelRepository = {
  async listMappings(
    hotelId: string,
    providerKey?: string,
  ): Promise<ChannelRoomMappingView[]> {
    const rows = await prisma.channelRoomMapping.findMany({
      where: {
        hotelId,
        ...(providerKey ? { providerKey } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapMapping);
  },

  async upsertMapping(input: {
    hotelId: string;
    providerKey: string;
    roomTypeId: string;
    externalRoomCode: string;
    externalRateCode: string | null;
    active: boolean;
  }): Promise<ChannelRoomMappingView> {
    const rateKey = input.externalRateCode?.trim() || "";
    const existing = await prisma.channelRoomMapping.findFirst({
      where: {
        hotelId: input.hotelId,
        providerKey: input.providerKey,
        roomTypeId: input.roomTypeId,
        externalRateCode: rateKey,
      },
    });
    if (existing) {
      const row = await prisma.channelRoomMapping.update({
        where: { id: existing.id },
        data: {
          externalRoomCode: input.externalRoomCode,
          externalRateCode: rateKey,
          active: input.active,
        },
      });
      return mapMapping(row);
    }
    const row = await prisma.channelRoomMapping.create({
      data: {
        hotelId: input.hotelId,
        providerKey: input.providerKey,
        roomTypeId: input.roomTypeId,
        externalRoomCode: input.externalRoomCode,
        externalRateCode: rateKey,
        active: input.active,
      },
    });
    return mapMapping(row);
  },

  async deleteMapping(hotelId: string, id: string): Promise<boolean> {
    const res = await prisma.channelRoomMapping.deleteMany({
      where: { id, hotelId },
    });
    return res.count > 0;
  },

  async createJob(input: {
    hotelId: string;
    providerKey: string;
    kind: ChannelSyncKind;
    payloadJson?: unknown;
  }): Promise<ChannelSyncJobView> {
    const row = await prisma.channelSyncJob.create({
      data: {
        hotelId: input.hotelId,
        providerKey: input.providerKey,
        kind: input.kind,
        status: "QUEUED",
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
      },
    });
    return mapJob(row);
  },

  async listJobs(
    hotelId: string,
    limit = 30,
  ): Promise<ChannelSyncJobView[]> {
    const rows = await prisma.channelSyncJob.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapJob);
  },

  async getJob(
    hotelId: string,
    id: string,
  ): Promise<ChannelSyncJobView | null> {
    const row = await prisma.channelSyncJob.findFirst({
      where: { id, hotelId },
    });
    return row ? mapJob(row) : null;
  },

  async updateJob(
    id: string,
    data: {
      status: ChannelSyncJobStatus;
      attempts?: number;
      errorMessage?: string | null;
      resultJson?: unknown;
      startedAt?: Date | null;
      finishedAt?: Date | null;
    },
  ): Promise<ChannelSyncJobView> {
    const row = await prisma.channelSyncJob.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.attempts !== undefined ? { attempts: data.attempts } : {}),
        ...(data.errorMessage !== undefined
          ? { errorMessage: data.errorMessage }
          : {}),
        ...(data.resultJson !== undefined
          ? { resultJson: data.resultJson as Prisma.InputJsonValue }
          : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.finishedAt !== undefined
          ? { finishedAt: data.finishedAt }
          : {}),
      },
    });
    return mapJob(row);
  },

  /** Idempotent ingest by (hotelId, providerKey, externalReservationId). */
  async ingestReservation(input: {
    hotelId: string;
    providerKey: string;
    externalReservationId: string;
    payload: Record<string, unknown>;
  }): Promise<{ view: ChannelReservationView; created: boolean }> {
    const existing = await prisma.channelReservationInbox.findUnique({
      where: {
        hotelId_providerKey_externalReservationId: {
          hotelId: input.hotelId,
          providerKey: input.providerKey,
          externalReservationId: input.externalReservationId,
        },
      },
    });
    if (existing) {
      return { view: mapInbox(existing), created: false };
    }
    const row = await prisma.channelReservationInbox.create({
      data: {
        hotelId: input.hotelId,
        providerKey: input.providerKey,
        externalReservationId: input.externalReservationId,
        payloadJson: input.payload as Prisma.InputJsonValue,
        status: "RECEIVED",
      },
    });
    return { view: mapInbox(row), created: true };
  },

  async listReservations(
    hotelId: string,
    limit = 50,
  ): Promise<ChannelReservationView[]> {
    const rows = await prisma.channelReservationInbox.findMany({
      where: { hotelId },
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
    return rows.map(mapInbox);
  },
};
