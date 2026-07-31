import { describe, expect, it } from "vitest";
import { parseOpenHours } from "@/src/modules/knowledge";
import type { OpeningHours } from "@/src/modules/knowledge";
import { sortByProminence } from "./prominence";
import { scheduleDays } from "./schedule";
import type { ScheduleCandidateInput } from "./types";

const alwaysOpen: OpeningHours = {
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

type Ranked = ScheduleCandidateInput & {
  prominence?: "PRIMARY" | "SECONDARY" | "OPTIONAL" | null;
};

function alwaysSite(id: string, name: string): Ranked {
  return {
    id,
    name,
    lat: 39.65,
    lng: 66.96,
    openingHours: alwaysOpen,
    visitMinutes: 60,
    prominence: "SECONDARY",
  };
}

/**
 * Full chain: free-text hours → weekly JSON → scheduleDays.
 * Siyob is PRIMARY so it would fill a slot whenever the day is open —
 * Monday must skip it; Tuesday must place it.
 */
function siyobChainCandidates(): Ranked[] {
  const parsed = parseOpenHours("Se-Ya 07:00 - 19:00, dushanba yopiq");
  expect(parsed.parsed?.weekly.mon).toEqual([]);
  expect(parsed.parsed?.weekly.tue).toEqual([["07:00", "19:00"]]);

  return sortByProminence([
    {
      id: "siyob",
      name: "Siyob Bozori",
      lat: 39.662,
      lng: 66.98,
      openingHours: parsed.parsed,
      visitMinutes: 60,
      prominence: "PRIMARY",
    },
    alwaysSite("a", "Always Open A"),
    alwaysSite("b", "Always Open B"),
    alwaysSite("c", "Always Open C"),
  ]);
}

function placedIds(startDate: Date, dayCount: number): string[] {
  const result = scheduleDays({
    regionDisplay: "Samarqand",
    startDate,
    dayCount,
    candidates: siyobChainCandidates(),
  });
  return result.days.flatMap((d) =>
    d.slots
      .filter((s) => s.status === "PLACED" && s.siteId != null)
      .map((s) => s.siteId as string),
  );
}

describe("parseOpenHours → weekly → scheduleDays chain", () => {
  it("does not place Siyob on Monday (closed day)", () => {
    // 2026-08-03 is Monday
    const ids = placedIds(new Date(2026, 7, 3), 1);
    expect(ids).not.toContain("siyob");
    expect(ids.length).toBeGreaterThan(0);
  });

  it("places Siyob on Tuesday (open day)", () => {
    // 2026-08-04 is Tuesday — proves we did not simply blacklist Siyob forever
    const ids = placedIds(new Date(2026, 7, 4), 1);
    expect(ids).toContain("siyob");
  });
});
