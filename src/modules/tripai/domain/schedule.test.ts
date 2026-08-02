import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/src/modules/knowledge";
import {
  dataCoverageFromDays,
  evenSlotTargets,
  isOpenOnDay,
  scheduleDays,
  SLOTS_PER_DAY,
} from "./schedule";
import type { ScheduleCandidateInput } from "./types";

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

function site(
  id: string,
  name: string,
  hours: OpeningHours | null = weekdayOpen,
): ScheduleCandidateInput {
  return {
    id,
    name,
    lat: 39.65,
    lng: 66.96,
    openingHours: hours,
    visitMinutes: 60,
  };
}

function sixSites(): ScheduleCandidateInput[] {
  return [1, 2, 3, 4, 5, 6].map((n) => site(`s${n}`, `Site ${n}`));
}

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
      regionCode: "samarqand",
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
      regionCode: "zomin",
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
    expect(result.days).toHaveLength(3);
    expect(
      result.days.every(
        (d) =>
          d.slots.length === SLOTS_PER_DAY &&
          d.slots.every((s) => s.status === "NO_DATA"),
      ),
    ).toBe(true);
    expect(dataCoverageFromDays(result.days)).toBe("none");
  });

  it("returns days with NO_DATA slots when candidates are empty (does not throw)", () => {
    const result = scheduleDays({
      regionDisplay: "Empty",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates: [],
    });
    expect(result.days).toHaveLength(2);
    expect(result.placedSiteIds).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(
      result.days.every(
        (d) =>
          d.slots.length === SLOTS_PER_DAY &&
          d.slots.every((s) => s.status === "NO_DATA"),
      ),
    ).toBe(true);
    expect(dataCoverageFromDays(result.days)).toBe("none");
  });

  it("evenSlotTargets spreads remainder to earlier days", () => {
    expect(evenSlotTargets(6, 3)).toEqual([2, 2, 2]);
    expect(evenSlotTargets(7, 3)).toEqual([3, 2, 2]);
    expect(evenSlotTargets(5, 3)).toEqual([2, 2, 1]);
    expect(evenSlotTargets(0, 2)).toEqual([0, 0]);
  });

  it("6 sites / 3 days: even [2,2,2], no repeats, coverage not full", () => {
    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 3,
      candidates: sixSites(),
    });

    expect(result.days).toHaveLength(3);
    expect(result.days.every((d) => d.slots.length === SLOTS_PER_DAY)).toBe(
      true,
    );

    const placedCounts = result.days.map(
      (d) => d.slots.filter((s) => s.status === "PLACED").length,
    );
    const noDataCounts = result.days.map(
      (d) => d.slots.filter((s) => s.status === "NO_DATA").length,
    );
    const placed = result.days.flatMap((d) =>
      d.slots.filter((s) => s.status === "PLACED"),
    );
    const ids = placed.map((s) => s.siteId);

    expect(placedCounts).toEqual([2, 2, 2]);
    expect(noDataCounts).toEqual([1, 1, 1]);
    expect(placed).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    expect(dataCoverageFromDays(result.days)).toBe("partial");
  });

  it("6 sites / 2 days: all slots filled, no repeats, coverage full", () => {
    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates: sixSites(),
    });

    const placed = result.days.flatMap((d) =>
      d.slots.filter((s) => s.status === "PLACED"),
    );
    const noData = result.days.flatMap((d) =>
      d.slots.filter((s) => s.status === "NO_DATA"),
    );
    const ids = placed.map((s) => s.siteId);

    expect(result.days).toHaveLength(2);
    expect(placed).toHaveLength(6);
    expect(noData).toHaveLength(0);
    expect(new Set(ids).size).toBe(6);
    expect(dataCoverageFromDays(result.days)).toBe("full");
  });
});
