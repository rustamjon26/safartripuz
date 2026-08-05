export type CommissionBookingType = "HOTEL" | "HOMESTAY" | "GUIDE" | "TAXI";

export type CommissionRates = Record<CommissionBookingType, number>;

/**
 * Fallback when the `commission_rates` system setting is missing or unreadable.
 * Integer percent 0..100, never float fractions.
 */
export const DEFAULT_COMMISSION_RATES: CommissionRates = {
  HOTEL: 10,
  HOMESTAY: 10,
  GUIDE: 15,
  TAXI: 15,
};

/**
 * Coerce a stored setting value to an integer percent, or fall back.
 *
 * Truncating here is what keeps a float out of the money path entirely: a
 * configured 10.9% becomes 10 before it ever reaches the commission math.
 */
export function asRatePercent(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < 0 || i > 100) return fallback;
  return i;
}

/** Merge a raw JSON setting over the defaults, field by field. */
export function mergeCommissionRates(raw: unknown): CommissionRates {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_COMMISSION_RATES;
  }
  const obj = raw as Record<string, unknown>;
  return {
    HOTEL: asRatePercent(obj.HOTEL, DEFAULT_COMMISSION_RATES.HOTEL),
    HOMESTAY: asRatePercent(obj.HOMESTAY, DEFAULT_COMMISSION_RATES.HOMESTAY),
    GUIDE: asRatePercent(obj.GUIDE, DEFAULT_COMMISSION_RATES.GUIDE),
    TAXI: asRatePercent(obj.TAXI, DEFAULT_COMMISSION_RATES.TAXI),
  };
}
