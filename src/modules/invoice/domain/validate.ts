import { z } from "zod";

const lineSchema = z.object({
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(500).optional(),
  quantity: z.number().int().min(1).max(1_000_000),
  unitPriceSom: z.number().finite().min(0).max(1_000_000_000),
});

export const createInvoiceSchema = z.object({
  bookingId: z.string().min(1).optional(),
  clientName: z.string().trim().min(1).max(191),
  clientAddress: z.string().trim().max(500).optional(),
  clientCity: z.string().trim().max(191).optional(),
  clientCountry: z.string().trim().max(191).optional(),
  clientTin: z.string().trim().max(32).optional(),
  project: z.string().trim().max(191).optional(),
  terms: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
  vatRateBps: z.number().int().min(0).max(10000).optional(),
  dueAt: z.string().datetime().optional(),
  lines: z.array(lineSchema).min(1).max(200),
  issue: z.boolean().optional(),
});

export const patchInvoiceStatusSchema = z.object({
  status: z.enum(["ISSUED", "SENT", "PAID", "VOID"]),
});

export const listInvoicesQuerySchema = z.object({
  status: z
    .enum(["all", "DRAFT", "ISSUED", "SENT", "PAID", "VOID"])
    .default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
