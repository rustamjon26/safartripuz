import { z } from "zod";

export const mealTypeSchema = z.enum(["nonushta", "tushlik", "kechki"]);
export const priceBandSchema = z.enum(["arzon", "orta", "qimmat"]);

/**
 * Dining metadata for RESTORAN / CHAYXONA / KAFE Sites.
 * No numeric average price — priceBand is enough for planning.
 */
export const diningSchema = z.object({
  cuisine: z.array(z.string().min(1)).default([]),
  priceBand: priceBandSchema,
  mealTypes: z.array(mealTypeSchema).min(1),
  mustTry: z.array(z.string().min(1)).default([]),
  note: z.string().optional(),
});

export type MealType = z.infer<typeof mealTypeSchema>;
export type PriceBand = z.infer<typeof priceBandSchema>;
export type DiningInfo = z.infer<typeof diningSchema>;

/** Parse dining JSON; null for missing or invalid (never throws). */
export function parseDining(value: unknown): DiningInfo | null {
  if (value == null) return null;
  const result = diningSchema.safeParse(value);
  return result.success ? result.data : null;
}
