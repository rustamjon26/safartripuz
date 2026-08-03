import { z } from "zod";

export const otaProviderSchema = z.enum(["booking", "expedia", "airbnb"]);

export const upsertMappingSchema = z.object({
  providerKey: otaProviderSchema,
  roomTypeId: z.string().min(1),
  externalRoomCode: z.string().trim().min(1).max(64),
  externalRateCode: z.string().trim().min(1).max(64).optional(),
  active: z.boolean().optional(),
});

export const enqueueSyncSchema = z.object({
  providerKey: otaProviderSchema,
  kind: z
    .enum(["ARI_PUSH", "RESERVATION_PULL", "FULL_REFRESH", "MAPPING_PULL"])
    .default("FULL_REFRESH"),
});

export const ingestReservationSchema = z.object({
  providerKey: otaProviderSchema,
  externalReservationId: z.string().trim().min(1).max(191),
  payload: z.record(z.string(), z.unknown()),
});
