import { z } from "zod";

export const supportPartyTypeSchema = z.enum([
  "hotel",
  "homestay",
  "taxi",
  "guide",
  "customer",
]);

export const createSupportThreadSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(4000),
  /** Optional override; default inferred from actor role. */
  partyType: supportPartyTypeSchema.optional(),
});

export const sendSupportMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const patchSupportThreadSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]),
});

export const listSupportThreadsQuerySchema = z.object({
  status: z.enum(["all", "OPEN", "CLOSED"]).default("all"),
  partyType: z
    .enum(["all", "hotel", "homestay", "taxi", "guide", "customer"])
    .default("all"),
  q: z.string().trim().max(120).optional(),
});
