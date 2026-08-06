import { asTiyin, type Tiyin } from "@/src/shared/money";

/**
 * THE platform commission function. Tiyin BigInt, floor division.
 *
 * Floor — not half-up — is the ledger's rounding policy: the remainder stays
 * with the partner, so `platformTotal + partnerNet === gross` exactly and
 * `assertBalanced` holds without a rounding leg. Anything that needs a
 * different policy needs a ledger change, not a second function.
 *
 * `ratePercent` is an integer 0..100 (see `asRatePercent`).
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
 * The 5% booking fee + 5% HMS fee breakdown behind the default 10% hotel and
 * homestay rate. `platformTotal`/`partnerNet` are identical to
 * `calcPlatformCommissionTiyin(gross, 10)`; the extra legs exist to report the
 * two revenue streams separately.
 *
 * The integer-division remainder lands on `bookingFee` via
 * `platformTotal - bookingFee`, so the two legs always re-sum to the total.
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
