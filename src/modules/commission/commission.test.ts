import { describe, expect, it } from "vitest";
import { calcCommission, calcCommissionTiyin } from "@/lib/getCommissionRates";
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
