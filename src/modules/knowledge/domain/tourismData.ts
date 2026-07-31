import { z } from "zod";
import { diningSchema } from "./dining";

export const DINING_CATEGORIES = ["RESTORAN", "CHAYXONA", "KAFE"] as const;

export const tourismSiteSchema = z
  .object({
    name: z.string().min(1),
    nameRu: z.string().min(1).optional(),
    nameEn: z.string().min(1).optional(),
    /** Optional stable slug; when omitted, derived via slugify(name). */
    slug: z.string().min(1).optional(),
    regionCode: z.string().min(1),
    districtCode: z.string().min(1).optional(),
    category: z.enum([
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
    ]),
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    /** Free-text hours; parsed by parseOpenHours. */
    open_hours: z.string().nullable().optional(),
    sourceUrl: z.string().url().optional().nullable(),
    dining: diningSchema.optional().nullable(),
  })
  .superRefine((site, ctx) => {
    const isDining = (DINING_CATEGORIES as readonly string[]).includes(site.category);
    if (isDining && site.dining == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `dining is required for category ${site.category}`,
        path: ["dining"],
      });
    }
    if (!isDining && site.dining != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `dining must be omitted for non-dining category ${site.category}`,
        path: ["dining"],
      });
    }
  });

export const tourismDataSchema = z.object({
  version: z.literal(1),
  sites: z.array(tourismSiteSchema).min(1),
});

export type TourismSiteInput = z.infer<typeof tourismSiteSchema>;
export type TourismDataFile = z.infer<typeof tourismDataSchema>;
