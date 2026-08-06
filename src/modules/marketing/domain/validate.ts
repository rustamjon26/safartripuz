import { z } from "zod";
import { MAX_DISCOUNT_PERCENT } from "./promo";

export const hotelPromoTypeSchema = z.enum(["SEASONAL", "EVENT", "LOYALTY"]);

export const createHotelPromoSchema = z.object({
  title: z.string().trim().min(1).max(120),
  /** Optional campaign code; blank is stored as null, not "". */
  code: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Za-z0-9_-]*$/, "Kod faqat harf, raqam, _ va - dan iborat bo'lsin")
    .optional()
    .or(z.literal("")),
  /** Percent off. Accepts "15" from the form input. */
  discountPercent: z.coerce
    .number()
    .positive()
    .max(MAX_DISCOUNT_PERCENT)
    // 0.01% resolution keeps it lossless as basis points.
    .refine((v) => Number.isInteger(Math.round(v * 100)), "Ko'pi bilan 2 kasr raqam"),
  type: hotelPromoTypeSchema.default("SEASONAL"),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const patchHotelPromoSchema = z
  .object({
    isActive: z.boolean().optional(),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Hech qanday o'zgarish yo'q");

export type CreateHotelPromoInput = z.infer<typeof createHotelPromoSchema>;
export type PatchHotelPromoInput = z.infer<typeof patchHotelPromoSchema>;
