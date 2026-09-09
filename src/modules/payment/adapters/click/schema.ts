import { z } from "zod";

const numOrStr = z.union([z.string(), z.number()]);

/**
 * Click Shop API inbound body. Signature fields stay string|number so MD5
 * concatenates the same representation Click hashed (do not coerce amount
 * through Number before verify — trailing zeros on form-encoded amounts matter).
 */
export const clickShopBodySchema = z.object({
  click_trans_id: numOrStr,
  service_id: numOrStr,
  merchant_trans_id: numOrStr.transform((v) => String(v)),
  amount: numOrStr,
  action: numOrStr,
  sign_time: numOrStr.transform((v) => String(v)),
  sign_string: z.string().min(1),
  error: numOrStr.optional().default(0),
  error_note: z.union([z.string(), z.number()]).optional().default(""),
  click_paydoc_id: numOrStr.optional(),
  merchant_prepare_id: numOrStr.optional(),
});

export type ClickShopBody = z.infer<typeof clickShopBodySchema>;

export function asClickNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}
