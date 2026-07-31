import { z } from "zod";
import { seedDiningSchema } from "./dining";

export const DINING_CATEGORIES = ["RESTORAN", "CHAYXONA", "KAFE"] as const;

const CITY_TO_REGION: Record<string, string> = {
  samarqand: "samarqand",
  samarkand: "samarqand",
  toshkent: "toshkent",
  tashkent: "toshkent",
  buxoro: "buxoro",
  bukhara: "buxoro",
  xiva: "xiva",
  khiva: "xiva",
  zomin: "zomin",
};

/** Map Places `city` label → Site.regionCode. */
export function regionCodeFromCity(city: string): string {
  const key = city.trim().toLowerCase();
  const mapped = CITY_TO_REGION[key];
  if (!mapped) {
    throw new Error(
      `Unknown city "${city}" — add a mapping or set regionCode explicitly`,
    );
  }
  return mapped;
}

export const tourismSiteSchema = z
  .object({
    name: z.string().min(1),
    nameRu: z.string().min(1).optional(),
    nameEn: z.string().min(1).optional(),
    /** Optional stable slug; when omitted, derived via slugify(name). */
    slug: z.string().min(1).optional(),
    /** Preferred. Use instead of `city` when possible. */
    regionCode: z.string().min(1).optional(),
    /** Places export alias → normalized to regionCode. */
    city: z.string().min(1).optional(),
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
    /** Optional Places fields — not persisted on Site yet. */
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    dining: seedDiningSchema.optional().nullable(),
  })
  .superRefine((site, ctx) => {
    if (!site.regionCode && !site.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "regionCode or city is required",
        path: ["regionCode"],
      });
    }
    const isDining = (DINING_CATEGORIES as readonly string[]).includes(
      site.category,
    );
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
  })
  .transform((site) => {
    const regionCode =
      site.regionCode ?? regionCodeFromCity(site.city ?? "");
    const { city: _city, ...rest } = site;
    return { ...rest, regionCode };
  });

export const tourismDataSchema = z.object({
  version: z.literal(1),
  sites: z.array(tourismSiteSchema).min(1),
});

export type TourismSiteInput = z.infer<typeof tourismSiteSchema>;
export type TourismDataFile = z.infer<typeof tourismDataSchema>;
