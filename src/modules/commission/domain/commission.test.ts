import { describe, expect, it } from "vitest";
import { calcPlatformCommissionTiyin, splitBookingCommission } from "./commission";
import { DEFAULT_COMMISSION_RATES } from "./rates";

/**
 * The reference implementations this module replaced, inlined so the migration
 * is proved rather than assumed:
 *   - `calcPlatformCommissionTiyin` from src/modules/ledger/domain/commission.ts
 *   - `calcCommissionTiyin` from lib/getCommissionRates.ts (delegated to it)
 */
function legacyPlatformCommission(gross: bigint, ratePercent: number) {
  const rate = BigInt(Math.floor(ratePercent));
  const platformTotal = (gross * rate) / 100n;
  return { platformTotal, partnerNet: gross - platformTotal };
}

function legacySplitBookingCommission(gross: bigint) {
  const { platformTotal, partnerNet } = legacyPlatformCommission(gross, 10);
  const bookingFee = (gross * 5n) / 100n;
  return { bookingFee, hmsFee: platformTotal - bookingFee, platformTotal, partnerNet };
}

/** Amounts whose som representation is not exactly representable as a float. */
const AWKWARD_TIYIN = [
  0n,
  1n,
  4n,
  7n,
  29n,
  333n,
  10_101n,
  70_007n,
  999_999n,
  1_000_000_007n,
  90_071_992_547_409_931n,
];

describe("calcPlatformCommissionTiyin", () => {
  it("matches the pre-consolidation implementation exactly", () => {
    for (const gross of AWKWARD_TIYIN) {
      for (let percent = 0; percent <= 100; percent++) {
        expect(calcPlatformCommissionTiyin(gross, percent)).toEqual(
          legacyPlatformCommission(gross, percent),
        );
      }
    }
  });

  it("covers every configured rate tier", () => {
    const gross = 1_000_000n;
    expect(calcPlatformCommissionTiyin(gross, DEFAULT_COMMISSION_RATES.HOTEL)).toEqual({
      platformTotal: 100_000n,
      partnerNet: 900_000n,
    });
    expect(
      calcPlatformCommissionTiyin(gross, DEFAULT_COMMISSION_RATES.HOMESTAY),
    ).toEqual({ platformTotal: 100_000n, partnerNet: 900_000n });
    expect(calcPlatformCommissionTiyin(gross, DEFAULT_COMMISSION_RATES.GUIDE)).toEqual({
      platformTotal: 150_000n,
      partnerNet: 850_000n,
    });
    expect(calcPlatformCommissionTiyin(gross, DEFAULT_COMMISSION_RATES.TAXI)).toEqual({
      platformTotal: 150_000n,
      partnerNet: 850_000n,
    });
  });

  it("floors, so the remainder stays with the partner", () => {
    // Half-up would give 1 here. Floor is the ledger's policy; the whole point
    // of one module is that there is no second answer to this.
    expect(calcPlatformCommissionTiyin(5n, 10).platformTotal).toBe(0n);
    expect(calcPlatformCommissionTiyin(9n, 10).platformTotal).toBe(0n);
    expect(calcPlatformCommissionTiyin(10n, 10).platformTotal).toBe(1n);
    expect(calcPlatformCommissionTiyin(333n, 10)).toEqual({
      platformTotal: 33n,
      partnerNet: 300n,
    });
  });

  it("always reconstructs gross exactly, at every rate", () => {
    for (const gross of AWKWARD_TIYIN) {
      for (let percent = 0; percent <= 100; percent++) {
        const { platformTotal, partnerNet } = calcPlatformCommissionTiyin(
          gross,
          percent,
        );
        expect(platformTotal + partnerNet).toBe(gross);
        expect(platformTotal).toBeGreaterThanOrEqual(0n);
        expect(partnerNet).toBeGreaterThanOrEqual(0n);
      }
    }
  });

  it("handles the 0% and 100% edges", () => {
    expect(calcPlatformCommissionTiyin(10_000n, 0)).toEqual({
      platformTotal: 0n,
      partnerNet: 10_000n,
    });
    expect(calcPlatformCommissionTiyin(10_000n, 100)).toEqual({
      platformTotal: 10_000n,
      partnerNet: 0n,
    });
  });

  it("stays exact past Number.MAX_SAFE_INTEGER", () => {
    const gross = 90_071_992_547_409_931n;
    const { platformTotal, partnerNet } = calcPlatformCommissionTiyin(gross, 15);
    expect(platformTotal).toBe((gross * 15n) / 100n);
    expect(platformTotal + partnerNet).toBe(gross);
  });

  it("rejects a negative gross or an out-of-range rate", () => {
    expect(() => calcPlatformCommissionTiyin(-1n, 10)).toThrow(/grossTiyin/);
    expect(() => calcPlatformCommissionTiyin(100n, -1)).toThrow(/ratePercent/);
    expect(() => calcPlatformCommissionTiyin(100n, 101)).toThrow(/ratePercent/);
    expect(() => calcPlatformCommissionTiyin(100n, Number.NaN)).toThrow(/ratePercent/);
  });

  it("is deterministic across repeated calls", () => {
    const first = calcPlatformCommissionTiyin(12_345_678n, 10);
    for (let i = 0; i < 50; i++) {
      expect(calcPlatformCommissionTiyin(12_345_678n, 10)).toEqual(first);
    }
  });

  it("returns bigint, never a float", () => {
    const r = calcPlatformCommissionTiyin(999n, 15);
    expect(typeof r.platformTotal).toBe("bigint");
    expect(typeof r.partnerNet).toBe("bigint");
  });
});

describe("splitBookingCommission", () => {
  it("matches the pre-consolidation implementation exactly", () => {
    for (const gross of AWKWARD_TIYIN) {
      expect(splitBookingCommission(gross)).toEqual(
        legacySplitBookingCommission(gross),
      );
    }
  });

  it("splits the default 10% into 5% booking + 5% HMS", () => {
    const r = splitBookingCommission(1_000_000n);
    expect(r.bookingFee).toBe(50_000n);
    expect(r.hmsFee).toBe(50_000n);
    expect(r.platformTotal).toBe(100_000n);
    expect(r.partnerNet).toBe(900_000n);
  });

  it("keeps the two legs summing to the platform total, remainder on bookingFee", () => {
    for (const gross of AWKWARD_TIYIN) {
      const r = splitBookingCommission(gross);
      expect(r.bookingFee + r.hmsFee).toBe(r.platformTotal);
      expect(r.platformTotal + r.partnerNet).toBe(gross);
    }
  });

  it("agrees with the 10% rate path on the totals", () => {
    for (const gross of AWKWARD_TIYIN) {
      const split = splitBookingCommission(gross);
      const flat = calcPlatformCommissionTiyin(gross, 10);
      expect(split.platformTotal).toBe(flat.platformTotal);
      expect(split.partnerNet).toBe(flat.partnerNet);
    }
  });
});
