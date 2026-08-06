/**
 * Inventory keys every night on a UTC date-only value. A calendar date read in
 * the server's own zone lands on the previous day east of Greenwich, which on
 * the Asia/Tashkent host (UTC+5) shifted every stay by one night.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enumerateNights, formatDateOnly, parseDateOnlyUtc } from "./nights";

/** The formula this change replaced. */
function parseAsLocalMidnight(raw: string): Date {
  const [y, m, d] = raw.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

describe("parseDateOnlyUtc", () => {
  it("lands on UTC midnight of the given calendar date", () => {
    expect(parseDateOnlyUtc("2031-06-01")?.toISOString()).toBe(
      "2031-06-01T00:00:00.000Z",
    );
    expect(parseDateOnlyUtc("2031-01-01")?.toISOString()).toBe(
      "2031-01-01T00:00:00.000Z",
    );
    expect(parseDateOnlyUtc("2032-02-29")?.toISOString()).toBe(
      "2032-02-29T00:00:00.000Z",
    );
  });

  it("round-trips through formatDateOnly", () => {
    for (const raw of ["2031-06-01", "2031-12-31", "2031-03-08"]) {
      expect(formatDateOnly(parseDateOnlyUtc(raw)!)).toBe(raw);
    }
  });

  it("rejects malformed input and impossible dates", () => {
    for (const raw of ["", "2031-6-1", "01-06-2031", "2031-13-01", "2031-02-30"]) {
      expect(parseDateOnlyUtc(raw)).toBeNull();
    }
  });

  it("produces the nights the stay actually covers", () => {
    const nights = enumerateNights(
      parseDateOnlyUtc("2031-06-01")!,
      parseDateOnlyUtc("2031-06-04")!,
    );
    expect(nights.map(formatDateOnly)).toEqual([
      "2031-06-01",
      "2031-06-02",
      "2031-06-03",
    ]);
  });
});

describe("on an Asia/Tashkent server", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "Asia/Tashkent";
  });

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("still resolves the calendar date the guest asked for", () => {
    expect(parseDateOnlyUtc("2031-06-01")?.toISOString()).toBe(
      "2031-06-01T00:00:00.000Z",
    );
    expect(formatDateOnly(parseDateOnlyUtc("2031-06-01")!)).toBe("2031-06-01");
  });

  it("shows the day the old local-midnight parse lost", () => {
    const raw = "2031-06-01";
    const local = parseAsLocalMidnight(raw);

    // Guard: only meaningful when the runtime honoured the zone change.
    if (local.getTimezoneOffset() === 0) return;

    // UTC+5 → local midnight is 19:00 the previous day, and the night gets
    // filed under 2031-05-31.
    expect(formatDateOnly(local)).toBe("2031-05-31");
    expect(formatDateOnly(parseDateOnlyUtc(raw)!)).toBe("2031-06-01");
    expect(formatDateOnly(local)).not.toBe(formatDateOnly(parseDateOnlyUtc(raw)!));
  });
});
