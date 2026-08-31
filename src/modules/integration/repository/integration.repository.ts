import { prisma } from "@/src/shared/db/prisma";
import type {
  IntegrationCategory,
  IntegrationConnectionStatus,
} from "../domain/types";

export type IntegrationRow = {
  id: string;
  hotelId: string;
  providerKey: string;
  category: IntegrationCategory;
  status: IntegrationConnectionStatus;
  externalHotelId: string | null;
  credentialsEnc: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  meta: string | null;
};

export const integrationRepository = {
  async listForHotel(hotelId: string): Promise<IntegrationRow[]> {
    const rows = await prisma.hotelIntegration.findMany({
      where: { hotelId },
    });
    return rows.map((r) => ({
      id: r.id,
      hotelId: r.hotelId,
      providerKey: r.providerKey,
      category: r.category,
      status: r.status,
      externalHotelId: r.externalHotelId,
      credentialsEnc: r.credentialsEnc,
      lastSyncAt: r.lastSyncAt,
      lastError: r.lastError,
      meta: r.meta,
    }));
  },

  async get(
    hotelId: string,
    providerKey: string,
  ): Promise<IntegrationRow | null> {
    const r = await prisma.hotelIntegration.findUnique({
      where: { hotelId_providerKey: { hotelId, providerKey } },
    });
    if (!r) return null;
    return {
      id: r.id,
      hotelId: r.hotelId,
      providerKey: r.providerKey,
      category: r.category,
      status: r.status,
      externalHotelId: r.externalHotelId,
      credentialsEnc: r.credentialsEnc,
      lastSyncAt: r.lastSyncAt,
      lastError: r.lastError,
      meta: r.meta,
    };
  },

  async upsert(input: {
    hotelId: string;
    providerKey: string;
    category: IntegrationCategory;
    status: IntegrationConnectionStatus;
    externalHotelId?: string | null;
    credentialsEnc?: string | null;
    meta?: string | null;
    lastError?: string | null;
    lastSyncAt?: Date | null;
  }): Promise<IntegrationRow> {
    const r = await prisma.hotelIntegration.upsert({
      where: {
        hotelId_providerKey: {
          hotelId: input.hotelId,
          providerKey: input.providerKey,
        },
      },
      create: {
        hotelId: input.hotelId,
        providerKey: input.providerKey,
        category: input.category,
        status: input.status,
        externalHotelId: input.externalHotelId ?? null,
        credentialsEnc: input.credentialsEnc ?? null,
        meta: input.meta ?? null,
        lastError: input.lastError ?? null,
        lastSyncAt: input.lastSyncAt ?? null,
      },
      update: {
        status: input.status,
        ...(input.externalHotelId !== undefined
          ? { externalHotelId: input.externalHotelId }
          : {}),
        ...(input.credentialsEnc !== undefined
          ? { credentialsEnc: input.credentialsEnc }
          : {}),
        ...(input.meta !== undefined ? { meta: input.meta } : {}),
        ...(input.lastError !== undefined ? { lastError: input.lastError } : {}),
        ...(input.lastSyncAt !== undefined
          ? { lastSyncAt: input.lastSyncAt }
          : {}),
      },
    });
    return {
      id: r.id,
      hotelId: r.hotelId,
      providerKey: r.providerKey,
      category: r.category,
      status: r.status,
      externalHotelId: r.externalHotelId,
      credentialsEnc: r.credentialsEnc,
      lastSyncAt: r.lastSyncAt,
      lastError: r.lastError,
      meta: r.meta,
    };
  },

  async touchSync(
    hotelId: string,
    providerKey: string,
    opts: { ok: boolean; error?: string },
  ): Promise<void> {
    await prisma.hotelIntegration.updateMany({
      where: { hotelId, providerKey },
      data: {
        lastSyncAt: new Date(),
        lastError: opts.ok ? null : (opts.error ?? "Sync failed"),
        status: opts.ok ? "CONNECTED" : "ERROR",
      },
    });
  },
};
