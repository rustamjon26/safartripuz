import { describe, expect, it } from "vitest";
import { expandDaySpec, parseOpenHours } from "./parseOpenHours";

describe("expandDaySpec", () => {
  it("expands Du-Ju as Mon–Fri", () => {
    expect(expandDaySpec("Du-Ju")).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
    ]);
  });

  it("keeps Sh, Ya as a list (not a wrap range)", () => {
    expect(expandDaySpec("Sh, Ya")).toEqual(["sat", "sun"]);
  });

  it("expands Sh-Ya as Sat–Sun", () => {
    expect(expandDaySpec("Sh-Ya")).toEqual(["sat", "sun"]);
  });
});

describe("parseOpenHours", () => {
  it("returns null raw/parsed for empty input", () => {
    expect(parseOpenHours(null)).toEqual({ raw: null, parsed: null });
    expect(parseOpenHours(undefined)).toEqual({ raw: null, parsed: null });
    expect(parseOpenHours("")).toEqual({ raw: null, parsed: null });
    expect(parseOpenHours("   ")).toEqual({ raw: null, parsed: null });
  });

  it("parses a simple daily range", () => {
    const result = parseOpenHours("09:00 - 19:00");
    expect(result.raw).toBe("09:00 - 19:00");
    expect(result.parsed?.weekly.mon).toEqual([["09:00", "19:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([["09:00", "19:00"]]);
  });

  it("parses overnight until midnight (09:00 - 00:00)", () => {
    const result = parseOpenHours("09:00 - 00:00");
    expect(result.parsed?.weekly.mon).toEqual([["09:00", "00:00"]]);
    // open > close ⇒ overnight path in isOpenAt
    const open = 9 * 60;
    const close = 0;
    expect(open > close).toBe(true);
  });

  it("parses overnight past midnight (11:00 - 02:00)", () => {
    const result = parseOpenHours("11:00 - 02:00");
    expect(result.parsed?.weekly.fri).toEqual([["11:00", "02:00"]]);
  });

  it("parses per-day ranges Du-Ju / Sh-Ya", () => {
    const result = parseOpenHours("Du-Ju 07:00 - 22:00, Sh-Ya 09:00 - 22:00");
    expect(result.parsed?.weekly.mon).toEqual([["07:00", "22:00"]]);
    expect(result.parsed?.weekly.fri).toEqual([["07:00", "22:00"]]);
    expect(result.parsed?.weekly.sat).toEqual([["09:00", "22:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([["09:00", "22:00"]]);
  });

  it("parses Du-Sh with yakshanba yopiq", () => {
    const result = parseOpenHours("Du-Sh 09:00 - 18:00, yakshanba yopiq");
    expect(result.parsed?.weekly.mon).toEqual([["09:00", "18:00"]]);
    expect(result.parsed?.weekly.sat).toEqual([["09:00", "18:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([]);
  });

  it("parses a single-day spec plus a range (Du / Se-Ya)", () => {
    const result = parseOpenHours("Du 08:00 - 18:00, Se-Ya 08:00 - 19:00");
    expect(result.parsed?.weekly.mon).toEqual([["08:00", "18:00"]]);
    expect(result.parsed?.weekly.tue).toEqual([["08:00", "19:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([["08:00", "19:00"]]);
  });

  it("closes Monday when marked dushanba yopiq (not only yakshanba)", () => {
    const result = parseOpenHours("Se-Ya 07:00 - 19:00, dushanba yopiq");
    expect(result.parsed?.weekly.mon).toEqual([]);
    expect(result.parsed?.weekly.tue).toEqual([["07:00", "19:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([["07:00", "19:00"]]);
  });

  it("clears Monday from an all-week bare range when dushanba yopiq", () => {
    const result = parseOpenHours("09:00 - 19:00, dushanba yopiq");
    expect(result.parsed?.weekly.mon).toEqual([]);
    expect(result.parsed?.weekly.tue).toEqual([["09:00", "19:00"]]);
    expect(result.parsed?.weekly.sun).toEqual([["09:00", "19:00"]]);
  });

  it("parses 24/7", () => {
    const result = parseOpenHours("24/7");
    expect(result.parsed?.weekly.mon).toEqual([["00:00", "23:59"]]);
    expect(result.parsed?.weekly.sat).toEqual([["00:00", "23:59"]]);
  });

  it("closes weekends when marked", () => {
    const result = parseOpenHours("09:00 - 18:00, dam olish kunlari yopiq");
    expect(result.parsed?.weekly.fri).toEqual([["09:00", "18:00"]]);
    expect(result.parsed?.weekly.sat).toEqual([]);
    expect(result.parsed?.weekly.sun).toEqual([]);
  });

  it("throws on unrecognized text", () => {
    expect(() => parseOpenHours("ertalabdan kechgacha")).toThrow(
      /Unrecognized open hours/,
    );
  });

  it("throws when weekends-closed has no range", () => {
    expect(() => parseOpenHours("dam olish kunlari yopiq")).toThrow(
      /no time range/,
    );
  });
});
