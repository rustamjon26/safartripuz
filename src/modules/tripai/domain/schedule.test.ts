import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/src/modules/knowledge";
import { isOpenOnDay, scheduleDays } from "./schedule";

const weekdayOpen: OpeningHours = {
  weekly: {
    mon: [["09:00", "18:00"]],
    tue: [["09:00", "18:00"]],
    wed: [["09:00", "18:00"]],
    thu: [["09:00", "18:00"]],
    fri: [["09:00", "18:00"]],
    sat: [["09:00", "18:00"]],
    sun: [["09:00", "18:00"]],
  },
};

describe("scheduleDays", () => {
  it("never places a site on a closed day (closedDates)", () => {
    // 2026-07-27 is Monday
    const closedMonday: OpeningHours = {
      ...weekdayOpen,
      closedDates: ["2026-07-27"],
    };
    const openAlways = weekdayOpen;

    const result = scheduleDays({
      regionDisplay: "Test",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates: [
        {
          id: "closed-site",
          name: "Closed Site",
          lat: 39.65,
          lng: 66.96,
          openingHours: closedMonday,
          visitMinutes: 60,
        },
        {
          id: "open-site",
          name: "Open Site",
          lat: 39.66,
          lng: 66.97,
          openingHours: openAlways,
          visitMinutes: 60,
        },
      ],
    });

    const day1 = result.days[0]!;
    expect(day1.date).toBe("2026-07-27");
    expect(day1.slots.every((s) => s.siteId !== "closed-site")).toBe(true);
    expect(isOpenOnDay(closedMonday, new Date(2026, 6, 27))).toBe(false);
  });

  it("excludes a site with zero open slots in range and lists it in missing", () => {
    const alwaysClosed: OpeningHours = {
      weekly: {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      },
    };

    const result = scheduleDays({
      regionDisplay: "Zomin",
      startDate: new Date(2026, 6, 27),
      dayCount: 3,
      candidates: [
        {
          id: "never-open",
          name: "Forever Closed",
          lat: null,
          lng: null,
          openingHours: alwaysClosed,
          visitMinutes: 60,
        },
      ],
    });

    expect(result.placedSiteIds).toEqual([]);
    expect(result.missing.some((m) => m.includes("never-open"))).toBe(true);
    expect(result.days.every((d) => d.slots.length === 0)).toBe(true);
  });

  it("returns empty schedule without throwing when candidates are empty", () => {
    const result = scheduleDays({
      regionDisplay: "Empty",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates: [],
    });
    expect(result.days).toHaveLength(2);
    expect(result.placedSiteIds).toEqual([]);
    expect(result.missing).toEqual([]);
  });
});
