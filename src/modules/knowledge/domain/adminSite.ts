import { z } from "zod";
import { seedDiningSchema } from "./dining";
import { DINING_CATEGORIES } from "./tourismData";

export const SITE_CATEGORY_VALUES = [
  "OBIDA",
  "MADRASA",
  "MASJID",
  "MAQBARA",
  "MUZEY",
  "ARXEOLOGIYA",
  "TABIAT",
  "BOZOR",
  "ZIYORATGOH",
  "BOSHQA",
  "RESTORAN",
  "CHAYXONA",
  "KAFE",
] as const;

export const SITE_STATUS_VALUES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const SITE_PROMINENCE_VALUES = [
  "PRIMARY",
  "SECONDARY",
  "OPTIONAL",
] as const;

const sourceUrlSchema = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t === "" ? null : t;
  });

/**
 * Admin create body. Always stored as DRAFT; publish is a separate action.
 * `open_hours` is free text → parseOpenHours (same as seed).
 */
export const adminSiteCreateSchema = z
  .object({
    name: z.string().min(1),
    nameRu: z.string().min(1).optional().nullable(),
    nameEn: z.string().min(1).optional().nullable(),
    slug: z.string().min(1).optional(),
    regionCode: z.string().min(1),
    districtCode: z.string().min(1).optional().nullable(),
    category: z.enum(SITE_CATEGORY_VALUES),
    lat: z.number().finite().optional().nullable(),
    lng: z.number().finite().optional().nullable(),
    open_hours: z.string().optional().nullable(),
    sourceUrl: sourceUrlSchema,
    prominence: z.enum(SITE_PROMINENCE_VALUES).optional().nullable(),
    dining: seedDiningSchema.optional().nullable(),
  })
  .superRefine((site, ctx) => {
    const isDining = (DINING_CATEGORIES as readonly string[]).includes(
      site.category,
    );
    if (isDining && site.dining == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dining is required for RESTORAN / CHAYXONA / KAFE",
        path: ["dining"],
      });
    }
    if (!isDining && site.dining != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dining must be omitted for non-dining categories",
        path: ["dining"],
      });
    }
  });

/** Partial update — status is never changed here (use publishSite). */
export const adminSiteUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    nameRu: z.string().min(1).optional().nullable(),
    nameEn: z.string().min(1).optional().nullable(),
    regionCode: z.string().min(1).optional(),
    districtCode: z.string().min(1).optional().nullable(),
    category: z.enum(SITE_CATEGORY_VALUES).optional(),
    lat: z.number().finite().optional().nullable(),
    lng: z.number().finite().optional().nullable(),
    open_hours: z.string().optional().nullable(),
    /** Pass null to clear stored hours. Omit to leave unchanged. */
    clearOpeningHours: z.boolean().optional(),
    sourceUrl: sourceUrlSchema,
    prominence: z.enum(SITE_PROMINENCE_VALUES).optional().nullable(),
    dining: seedDiningSchema.optional().nullable(),
    clearDining: z.boolean().optional(),
  })
  .superRefine((site, ctx) => {
    if (site.category == null) return;
    const isDining = (DINING_CATEGORIES as readonly string[]).includes(
      site.category,
    );
    if (isDining && site.clearDining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cannot clear dining on a dining category",
        path: ["clearDining"],
      });
    }
    if (!isDining && site.dining != null && !site.clearDining) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dining must be omitted for non-dining categories",
        path: ["dining"],
      });
    }
  });

export type AdminSiteCreateInput = z.infer<typeof adminSiteCreateSchema>;
export type AdminSiteUpdateInput = z.infer<typeof adminSiteUpdateSchema>;
