import { describe, expect, it } from "vitest";
import { pickSeasonalOverride } from "./pricing";

type Rule = { startDate: string; endDate: string; priceTiyin: bigint };

const rule = (startDate: string, endDate: string, priceTiyin: bigint): Rule => ({
  startDate,
  endDate,
  priceTiyin,
});

describe("pickSeasonalOverride", () => {
  it("returns nothing when no rule covers the night", () => {
    expect(pickSeasonalOverride([rule("2030-06-01", "2030-08-31", 1n)], "2030-09-01")).toBeNull();
    expect(pickSeasonalOverride([], "2030-06-15")).toBeNull();
  });

  it("applies a single covering rule", () => {
    const summer = rule("2030-06-01", "2030-08-31", 500_000n);
    expect(pickSeasonalOverride([summer], "2030-07-04")).toBe(summer);
  });

  it("treats both range ends as inclusive", () => {
    const window = rule("2030-06-01", "2030-06-03", 1n);
    expect(pickSeasonalOverride([window], "2030-06-01")).toBe(window);
    expect(pickSeasonalOverride([window], "2030-06-03")).toBe(window);
    expect(pickSeasonalOverride([window], "2030-05-31")).toBeNull();
    expect(pickSeasonalOverride([window], "2030-06-04")).toBeNull();
  });

  it("the narrower window wins over the broader one it sits inside", () => {
    // How an operator layers rules: a season, with an event carved out of it.
    const season = rule("2030-06-01", "2030-08-31", 500_000n);
    const navruz = rule("2030-07-01", "2030-07-07", 900_000n);

    expect(pickSeasonalOverride([season, navruz], "2030-07-04")).toBe(navruz);
    // Order of the input must not matter.
    expect(pickSeasonalOverride([navruz, season], "2030-07-04")).toBe(navruz);
    // Outside the narrow window the season still applies.
    expect(pickSeasonalOverride([season, navruz], "2030-07-20")).toBe(season);
  });

  it("picks the narrowest of three nested windows", () => {
    const year = rule("2030-01-01", "2030-12-31", 100n);
    const month = rule("2030-07-01", "2030-07-31", 200n);
    const day = rule("2030-07-15", "2030-07-15", 300n);

    expect(pickSeasonalOverride([year, month, day], "2030-07-15")).toBe(day);
    expect(pickSeasonalOverride([day, year, month], "2030-07-15")).toBe(day);
  });

  it("breaks an equal-width tie on the later start date", () => {
    const earlier = rule("2030-07-01", "2030-07-07", 100n);
    const later = rule("2030-07-04", "2030-07-10", 200n);

    expect(pickSeasonalOverride([earlier, later], "2030-07-05")).toBe(later);
    expect(pickSeasonalOverride([later, earlier], "2030-07-05")).toBe(later);
  });

  it("breaks an identical-window tie on the higher price, deterministically", () => {
    const cheap = rule("2030-07-01", "2030-07-07", 100n);
    const dear = rule("2030-07-01", "2030-07-07", 900n);

    expect(pickSeasonalOverride([cheap, dear], "2030-07-03")).toBe(dear);
    expect(pickSeasonalOverride([dear, cheap], "2030-07-03")).toBe(dear);
  });

  it("gives the same answer whatever order the rows arrive in", () => {
    const rules = [
      rule("2030-01-01", "2030-12-31", 100n),
      rule("2030-06-01", "2030-08-31", 200n),
      rule("2030-07-01", "2030-07-07", 300n),
      rule("2030-07-04", "2030-07-04", 400n),
    ];
    const expected = pickSeasonalOverride(rules, "2030-07-04");
    expect(expected?.priceTiyin).toBe(400n);

    // Every rotation of the same set.
    for (let i = 0; i < rules.length; i++) {
      const rotated = [...rules.slice(i), ...rules.slice(0, i)];
      expect(pickSeasonalOverride(rotated, "2030-07-04")?.priceTiyin).toBe(400n);
    }
  });

  it("does not fall over on a malformed date", () => {
    const broken = rule("not-a-date", "also-not", 1n);
    const good = rule("2030-07-01", "2030-07-07", 2n);
    expect(pickSeasonalOverride([broken, good], "2030-07-03")).toBe(good);
  });
});
