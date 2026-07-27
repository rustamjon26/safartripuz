import { asTiyin, type Tiyin } from "../../../shared/money";

/**
 * ONE pure commission function (tiyin BigInt). Floor division.
 * `ratePercent` is integer 0..100.
 */
export function calcPlatformCommissionTiyin(
  grossTiyin: bigint | Tiyin,
  ratePercent: number,
): { platformTotal: Tiyin; partnerNet: Tiyin } {
  if (grossTiyin < 0n) throw new Error("grossTiyin must be >= 0");
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    throw new Error("ratePercent must be 0..100");
  }
  const gross = asTiyin(BigInt(grossTiyin));
  const rate = BigInt(Math.floor(ratePercent));
  const platformTotal = asTiyin((gross * rate) / 100n);
  return { platformTotal, partnerNet: asTiyin(gross - platformTotal) };
}

/**
 * Hotel/Homestay default: 5% + 5% = 10% platform; partner net = gross - platform.
 * Remainder from integer division stays on bookingFee leg via platformTotal - hmsFee.
 */
export function splitBookingCommission(grossTiyin: bigint | Tiyin): {
  bookingFee: Tiyin;
  hmsFee: Tiyin;
  platformTotal: Tiyin;
  partnerNet: Tiyin;
} {
  const { platformTotal, partnerNet } = calcPlatformCommissionTiyin(grossTiyin, 10);
  const gross = asTiyin(BigInt(grossTiyin));
  const bookingFee = asTiyin((gross * 5n) / 100n);
  const hmsFee = asTiyin(platformTotal - bookingFee);
  return { bookingFee, hmsFee, platformTotal, partnerNet };
}
