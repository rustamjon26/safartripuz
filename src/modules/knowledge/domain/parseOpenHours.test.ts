import { describe, expect, it } from "vitest";
import { parseOpenHours } from "./parseOpenHours";

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
    expect(() => parseOpenHours("ertalabdan kechgacha")).toThrow(/Unrecognized open hours/);
  });

  it("throws when weekends-closed has no range", () => {
    expect(() => parseOpenHours("dam olish kunlari yopiq")).toThrow(/no time range/);
  });
});
