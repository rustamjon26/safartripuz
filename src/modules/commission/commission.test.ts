import { describe, expect, it } from "vitest";
import { calcCommission, calcCommissionTiyin } from "@/lib/getCommissionRates";

describe("commission float compat (calcCommission)", () => {
  it("10% of 100000 → fee 10000 net 90000", () => {
    const r = calcCommission(100000, 10);
    expect(r.commissionFee).toBe(10000);
    expect(r.netAmount).toBe(90000);
  });

  it("edge 0% and 100%", () => {
    expect(calcCommission(500, 0)).toEqual({ commissionFee: 0, netAmount: 500 });
    expect(calcCommission(500, 100)).toEqual({
      commissionFee: 500,
      netAmount: 0,
    });
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
});
