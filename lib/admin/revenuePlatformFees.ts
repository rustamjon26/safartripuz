import type { PartnerEarningType } from "@prisma/client";
import type { RevenueCategory } from "@/lib/payments/travelPlanBookingTypes";
import { Money } from "@/src/shared/money";

/**
 * Map Ledger platform-REVENUE totals (tiyin, by bookingType) onto admin
 * revenue buckets. Includes PLATFORM-owned bookings (no PartnerEarning).
 */
export function ledgerPlatformFeesToBuckets(
  byTypeTiyin: Map<PartnerEarningType, bigint> | Map<string, bigint>,
): Record<Exclude<RevenueCategory, "OTHER">, number> {
  const out: Record<Exclude<RevenueCategory, "OTHER">, number> = {
    HOTEL: 0,
    HOMESTAY: 0,
    GUIDE: 0,
    TAXI: 0,
  };
  for (const key of ["HOTEL", "HOMESTAY", "GUIDE", "TAXI"] as const) {
    const tiyin = byTypeTiyin.get(key) ?? 0n;
    const clamped = tiyin < 0n ? 0n : tiyin;
    out[key] = Money.fromTiyin(clamped).toSomNumber();
  }
  return out;
}
