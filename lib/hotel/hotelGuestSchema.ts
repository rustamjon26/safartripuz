import { z } from "zod";

export const createGuestBodySchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
  passportId: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  birthDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  isVip: z.boolean().optional(),
  isBlacklist: z.boolean().optional(),
});

export const updateGuestBodySchema = createGuestBodySchema.partial();

export const listGuestsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  is_vip: z.enum(["true", "false"]).optional(),
  is_blacklist: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "visit_count", "total_spent", "last_visit"]).default("last_visit"),
});

export type CreateGuestBody = z.infer<typeof createGuestBodySchema>;
export type UpdateGuestBody = z.infer<typeof updateGuestBodySchema>;

export function parseBirthDate(raw: string | null | undefined): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(raw);
}
