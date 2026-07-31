import { z } from "zod";

export const mealTypeSchema = z.enum(["nonushta", "tushlik", "kechki"]);
export const priceBandSchema = z.enum(["arzon", "orta", "qimmat"]);

/**
 * Dining metadata for RESTORAN / CHAYXONA / KAFE Sites.
 * No numeric average price — priceBand is enough for planning.
 * Planner-facing: mealTypes should be non-empty when used for slots.
 */
export const diningSchema = z.object({
  cuisine: z.array(z.string().min(1)).default([]),
  priceBand: priceBandSchema,
  mealTypes: z.array(mealTypeSchema).min(1),
  mustTry: z.array(z.string().min(1)).default([]),
  note: z.string().optional(),
});

/**
 * Seed / Places import: unknown dining facets may be null — do not invent.
 * Empty mealTypes means the site will not fill meal slots until edited.
 */
export const seedDiningSchema = z.object({
  cuisine: z
    .union([z.array(z.string()), z.null()])
    .optional()
    .transform((v) => v ?? []),
  priceBand: z.union([priceBandSchema, z.null()]).optional(),
  mealTypes: z
    .union([z.array(mealTypeSchema), z.null()])
    .optional()
    .transform((v) => v ?? []),
  mustTry: z
    .union([z.array(z.string()), z.null()])
    .optional()
    .transform((v) => v ?? []),
  note: z.union([z.string(), z.null()]).optional(),
});

export type MealType = z.infer<typeof mealTypeSchema>;
export type PriceBand = z.infer<typeof priceBandSchema>;
export type DiningInfo = z.infer<typeof diningSchema>;
export type SeedDiningInfo = z.infer<typeof seedDiningSchema>;

/** Parse dining JSON; null for missing or invalid (never throws). */
export function parseDining(value: unknown): DiningInfo | null {
  if (value == null) return null;
  const result = diningSchema.safeParse(value);
  return result.success ? result.data : null;
}
