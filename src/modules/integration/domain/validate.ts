import { z } from "zod";

export const providerKeySchema = z.enum([
  "booking",
  "expedia",
  "airbnb",
  "payme",
  "click",
  "uzum",
  "yandex",
  "guides",
]);

export const connectIntegrationSchema = z.object({
  providerKey: providerKeySchema,
  externalHotelId: z.string().trim().min(1).max(191).optional(),
  /** Opaque credentials object — stored encrypted; never echoed. */
  credentials: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  meta: z.string().trim().max(191).optional(),
  /** Force LICENSE_REQUIRED (e.g. Airbnb without cert). */
  licenseRequired: z.boolean().optional(),
});

export const disconnectIntegrationSchema = z.object({
  providerKey: providerKeySchema,
});
