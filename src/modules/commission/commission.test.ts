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

