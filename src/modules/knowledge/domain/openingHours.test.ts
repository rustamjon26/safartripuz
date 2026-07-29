import { describe, expect, it } from "vitest";
import {
  formatDateOnly,
  isInSeasonalWindow,
  isOpenAt,
  nextOpenSlot,
} from "./openingHours";
import type { OpeningHours } from "./types";

const base: OpeningHours = {
  weekly: {
    mon: [["09:00", "18:00"]],
    tue: [["09:00", "18:00"]],
    wed: [["09:00", "18:00"]],
    thu: [["09:00", "18:00"]],
    fri: [["09:00", "18:00"]],
    sat: [["10:00", "16:00"]],
    sun: [],
  },
  closedDates: ["2026-09-01"],
};

describe("openingHours", () => {
  it("isOpenAt respects weekday ranges", () => {
    // 2026-07-27 is a Monday
    const monMorning = new Date(2026, 6, 27, 10, 0, 0);
    expect(isOpenAt(base, monMorning)).toBe(true);
    const monLate = new Date(2026, 6, 27, 19, 0, 0);
    expect(isOpenAt(base, monLate)).toBe(false);
  });

  it("isOpenAt returns false on closedDates", () => {
    const closed = new Date(2026, 8, 1, 12, 0, 0);
    expect(formatDateOnly(closed)).toBe("2026-09-01");
    expect(isOpenAt(base, closed)).toBe(false);
  });

  it("isOpenAt returns false when weekday has empty ranges", () => {
    const sunday = new Date(2026, 6, 26, 12, 0, 0); // Sunday
    expect(isOpenAt(base, sunday)).toBe(false);
  });

  it("seasonal window wraps year end", () => {
    expect(isInSeasonalWindow("12-15", "11-01", "03-01")).toBe(true);
    expect(isInSeasonalWindow("02-01", "11-01", "03-01")).toBe(true);
    expect(isInSeasonalWindow("06-01", "11-01", "03-01")).toBe(false);
  });

  it("nextOpenSlot finds the next weekday open", () => {
    const sundayNoon = new Date(2026, 6, 26, 12, 0, 0);
    const next = nextOpenSlot(base, sundayNoon);
    expect(next).not.toBeNull();
    expect(next?.open).toBe("09:00");
    expect(formatDateOnly(next!.at)).toBe("2026-07-27");
  });
});
