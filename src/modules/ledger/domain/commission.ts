import { asTiyin, type Tiyin } from "@/src/shared/money";

/**
 * Pure commission split in tiyin (branded).
 * Hotel/Homestay: 5% + 5% = 10% platform; partner net = gross - platform.
 * Remainder from integer division goes to platform booking fee leg.
 * SINGLE source for platform 10% split used by ledger posts.
 */
export function splitBookingCommission(grossTiyin: bigint | Tiyin): {
  bookingFee: Tiyin;
  hmsFee: Tiyin;
  platformTotal: Tiyin;
  partnerNet: Tiyin;
} {
  if (grossTiyin < 0n) throw new Error("grossTiyin must be >= 0");
  const gross = asTiyin(BigInt(grossTiyin));
  const platformTotal = asTiyin((gross * 10n) / 100n);
  const bookingFee = asTiyin((gross * 5n) / 100n);
  const hmsFee = asTiyin(platformTotal - bookingFee);
  const partnerNet = asTiyin(gross - platformTotal);
  return { bookingFee, hmsFee, platformTotal, partnerNet };
}
