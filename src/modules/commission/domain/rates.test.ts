import { describe, expect, it } from "vitest";
import {
  asRatePercent,
  DEFAULT_COMMISSION_RATES,
  mergeCommissionRates,
} from "./rates";

describe("asRatePercent", () => {
  it("truncates rather than rounding, so a float never reaches the money math", () => {
    expect(asRatePercent(10.9, 10)).toBe(10);
    expect(asRatePercent(15.999, 10)).toBe(15);
  });

  it("accepts a numeric string, since JSON settings are hand-edited", () => {
    expect(asRatePercent("15", 10)).toBe(15);
    expect(asRatePercent("15.7", 10)).toBe(15);
  });

  it("falls back on anything out of range or unparseable", () => {
    expect(asRatePercent(-1, 10)).toBe(10);
    expect(asRatePercent(101, 10)).toBe(10);
    expect(asRatePercent("abc", 12)).toBe(12);
    expect(asRatePercent(null, 12)).toBe(12);
    expect(asRatePercent(undefined, 12)).toBe(12);
    expect(asRatePercent({}, 12)).toBe(12);
    expect(asRatePercent(Number.NaN, 12)).toBe(12);
    expect(asRatePercent(Number.POSITIVE_INFINITY, 12)).toBe(12);
  });

  it("keeps the 0 and 100 boundaries", () => {
    expect(asRatePercent(0, 10)).toBe(0);
    expect(asRatePercent(100, 10)).toBe(100);
  });
});

describe("mergeCommissionRates", () => {
  it("returns the defaults for a non-object setting", () => {
    expect(mergeCommissionRates(null)).toEqual(DEFAULT_COMMISSION_RATES);
    expect(mergeCommissionRates("nope")).toEqual(DEFAULT_COMMISSION_RATES);
    expect(mergeCommissionRates([1, 2])).toEqual(DEFAULT_COMMISSION_RATES);
  });

  it("overrides only the verticals present in the setting", () => {
    expect(mergeCommissionRates({ GUIDE: 20 })).toEqual({
      ...DEFAULT_COMMISSION_RATES,
      GUIDE: 20,
    });
  });

  it("falls back per field, so one bad value cannot poison the rest", () => {
    expect(mergeCommissionRates({ HOTEL: 12, HOMESTAY: 999, TAXI: "abc" })).toEqual({
      HOTEL: 12,
      HOMESTAY: DEFAULT_COMMISSION_RATES.HOMESTAY,
      GUIDE: DEFAULT_COMMISSION_RATES.GUIDE,
      TAXI: DEFAULT_COMMISSION_RATES.TAXI,
    });
  });

  it("documents the shipped defaults", () => {
    expect(DEFAULT_COMMISSION_RATES).toEqual({
      HOTEL: 10,
      HOMESTAY: 10,
      GUIDE: 15,
      TAXI: 15,
    });
  });
});
