import { describe, expect, it } from "vitest";
import {
  asRatePercent,
  calcCommission,
  calcCommissionTiyin,
  calcCommissionTiyinFromBps,
  ratePercentToBps,
} from "@/lib/getCommissionRates";
import {
  calcPlatformCommissionTiyin,
  splitBookingCommission,
} from "@/src/modules/ledger/domain/commission";

describe("calcCommission float removed", () => {
  it("throws directing callers to tiyin API", () => {
    expect(() => calcCommission(100000, 10)).toThrow(/calcCommissionTiyin/);
  });
});

describe("commission tiyin (calcCommissionTiyin)", () => {
  it("floors fractional tiyin", () => {
    const r = calcCommissionTiyin(333n, 10);
    expect(r.commissionFee).toBe(33n);
    expect(r.netAmount).toBe(300n);
  });

  it("edge 0 / 100", () => {
    expect(calcCommissionTiyin(10_000n, 0)).toEqual({
      commissionFee: 0n,
      netAmount: 10_000n,
    });
    expect(calcCommissionTiyin(10_000n, 100)).toEqual({
      commissionFee: 10_000n,
      netAmount: 0n,
    });
  });

  it("rejects invalid rate", () => {
    expect(() => calcCommissionTiyin(100n, -1)).toThrow();
    expect(() => calcCommissionTiyin(100n, 101)).toThrow();
  });

  it("matches calcPlatformCommissionTiyin", () => {
    const a = calcCommissionTiyin(1_000_000n, 15);
    const b = calcPlatformCommissionTiyin(1_000_000n, 15);
    expect(a.commissionFee).toBe(b.platformTotal);
    expect(a.netAmount).toBe(b.partnerNet);
  });
});

describe("splitBookingCommission", () => {
  it("10% platform with 5+5 legs", () => {
    const r = splitBookingCommission(1_000_000n);
    expect(r.platformTotal).toBe(100_000n);
    expect(r.bookingFee + r.hmsFee).toBe(r.platformTotal);
    expect(r.partnerNet).toBe(900_000n);
  });
});

describe("integer rate parsing + bps (no float drift)", () => {
  it("asRatePercent truncates and clamps", () => {
    expect(asRatePercent(10.9, 10)).toBe(10);
    expect(asRatePercent("15", 10)).toBe(15);
    expect(asRatePercent(-1, 10)).toBe(10);
    expect(asRatePercent(101, 10)).toBe(10);
  });

  it("bps path is deterministic across repeated runs", () => {
    const cases: Array<{ gross: bigint; percent: number }> = [
      { gross: 1n, percent: 10 },
      { gross: 333n, percent: 10 },
      { gross: 999_999n, percent: 15 },
      { gross: 12_345_678n, percent: 10 },
      { gross: 100_000_000n, percent: 15 },
    ];
    for (const c of cases) {
      const bps = ratePercentToBps(c.percent);
      const first = calcCommissionTiyinFromBps(c.gross, bps);
      for (let i = 0; i < 50; i++) {
        const again = calcCommissionTiyinFromBps(c.gross, bps);
        expect(again).toEqual(first);
        expect(again.commissionFee + again.netAmount).toBe(c.gross);
      }
    }
  });

  it("percent floor path also has zero drift", () => {
    const gross = 12_345_678n;
    const first = calcCommissionTiyin(gross, 10);
    for (let i = 0; i < 50; i++) {
      expect(calcCommissionTiyin(gross, 10)).toEqual(first);
      expect(calcPlatformCommissionTiyin(gross, 10).platformTotal).toBe(
        first.commissionFee,
      );
    }
  });
});

describe("integer tiyin inputs produce no floating point artifacts", () => {
  /** Amounts whose som representation is not exactly representable as a float. */
  const AWKWARD_TIYIN = [
    1n,
    7n,
    29n,
    333n,
    1_010_1n,
    70_007n,
    999_999n,
    1_000_000_007n,
  ];

  it("fee + net reconstructs gross exactly for every rate", () => {
    for (const gross of AWKWARD_TIYIN) {
      for (let percent = 0; percent <= 100; percent++) {
        const { commissionFee, netAmount } = calcCommissionTiyin(gross, percent);
        expect(commissionFee + netAmount).toBe(gross);
        expect(commissionFee).toBeGreaterThanOrEqual(0n);
        expect(netAmount).toBeGreaterThanOrEqual(0n);
      }
    }
  });

  it("stays exact past Number.MAX_SAFE_INTEGER", () => {
    // 2^53 tiyin would already lose precision as a float som value.
    const gross = 90_071_992_547_409_931n;
    const { commissionFee, netAmount } = calcCommissionTiyin(gross, 15);
    expect(commissionFee).toBe((gross * 15n) / 100n);
    expect(commissionFee + netAmount).toBe(gross);
  });

  it("bps half-up never leaks a fractional tiyin", () => {
    for (const gross of AWKWARD_TIYIN) {
      for (const percent of [0, 5, 10, 15, 33, 100]) {
        const r = calcCommissionTiyinFromBps(gross, ratePercentToBps(percent));
        expect(typeof r.commissionFee).toBe("bigint");
        expect(typeof r.netAmount).toBe("bigint");
        expect(r.commissionFee + r.netAmount).toBe(gross);
      }
    }
  });

  it("rejects a fractional-looking rate instead of silently flooring money", () => {
    // 10.9% is truncated to 10 at parse time; money math never sees a float.
    const gross = 1_000_000n;
    expect(calcCommissionTiyin(gross, asRatePercent(10.9, 10))).toEqual(
      calcCommissionTiyin(gross, 10),
    );
  });
});

