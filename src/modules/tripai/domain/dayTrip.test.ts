import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/src/modules/knowledge";
import {
  classifyDayTripIds,
  dayTripStartBudget,
  distanceToPrimaryCoreKm,
  isDayTripCandidate,
  primaryCoreAnchors,
  reservedDayTripStartIndexes,
} from "./dayTrip";
import { getMaxIntraDayLegKm, scheduleDays } from "./schedule";
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

const REGISTON = { lat: 39.6546466, lng: 66.9757669 };
const GURI = { lat: 39.6485469, lng: 66.9692492 };
const SHOHI = { lat: 39.6621368, lng: 66.9879377 };
const IMOM = { lat: 39.8151972, lng: 66.9445556 };
const AQSAROY = { lat: 39.6479388, lng: 66.9698788 };

function site(
  partial: Omit<ScheduleCandidateInput, "openingHours" | "visitMinutes"> & {
    openingHours?: OpeningHours | null;
    visitMinutes?: number;
  },
): ScheduleCandidateInput {
  return {
    openingHours: weekdayOpen,
    visitMinutes: 60,
    ...partial,
  };
}

describe("dayTrip classification", () => {
  const maxKm = getMaxIntraDayLegKm("samarqand");

  it("marks Imom (~18 km from PRIMARY) as day-trip; nearby SECONDARY not", () => {
    const candidates = [
      site({ id: "registon", name: "Registon", prominence: "PRIMARY", ...REGISTON }),
      site({ id: "guri", name: "Guri Amir", prominence: "PRIMARY", ...GURI }),
      site({ id: "aqsaroy", name: "Aqsaroy", prominence: "SECONDARY", ...AQSAROY }),
      site({ id: "imom", name: "Imom al-Buxoriy", prominence: "SECONDARY", ...IMOM }),
    ];
    const anchors = primaryCoreAnchors(candidates);
    expect(anchors).toHaveLength(2);
    expect(distanceToPrimaryCoreKm(candidates[3]!, anchors)).toBeGreaterThan(maxKm);
    expect(distanceToPrimaryCoreKm(candidates[2]!, anchors)).toBeLessThanOrEqual(maxKm);

    const ids = classifyDayTripIds(candidates, maxKm);
    expect(ids.has("imom")).toBe(true);
    expect(ids.has("aqsaroy")).toBe(false);
    expect(ids.has("registon")).toBe(false);
  });

  it("honors isDayTrip editorial override", () => {
    const nearForced = site({
      id: "forced",
      name: "Forced Day Trip",
      prominence: "SECONDARY",
      isDayTrip: true,
      ...AQSAROY,
    });
    const farBlocked = site({
      id: "blocked",
      name: "Far But Blocked",
      prominence: "SECONDARY",
      isDayTrip: false,
      ...IMOM,
    });
    const primary = site({
      id: "registon",
      name: "Registon",
      prominence: "PRIMARY",
      ...REGISTON,
    });
    const anchors = [primary];
    expect(isDayTripCandidate(nearForced, anchors, maxKm)).toBe(true);
    expect(isDayTripCandidate(farBlocked, anchors, maxKm)).toBe(false);
  });

  it("dayTripStartBudget: 0 under 3 days; 1 at 3; dayCount-2 at 4+", () => {
    expect(dayTripStartBudget(2, 3)).toBe(0);
    expect(dayTripStartBudget(3, 0)).toBe(0);
    expect(dayTripStartBudget(3, 2)).toBe(1);
    expect(dayTripStartBudget(4, 5)).toBe(2);
    expect(dayTripStartBudget(5, 1)).toBe(1);
    expect(dayTripStartBudget(6, 10)).toBe(4);
  });

  it("reservedDayTripStartIndexes prefers later days", () => {
    expect([...reservedDayTripStartIndexes(3, 1)].sort()).toEqual([2]);
    expect([...reservedDayTripStartIndexes(4, 2)].sort()).toEqual([2, 3]);
  });
});

describe("scheduleDays day-trip reservation", () => {
  it("3×3 with many PRIMARY: Imom gets a reserved day-start (was unreachable)", () => {
    const primaries: ScheduleCandidateInput[] = [];
    for (let i = 0; i < 5; i++) {
      primaries.push(
        site({
          id: `p-${i}`,
          name: `Primary ${i}`,
          prominence: "PRIMARY",
          lat: REGISTON.lat + i * 0.002,
          lng: REGISTON.lng + i * 0.002,
        }),
      );
    }
    const candidates = [
      ...primaries,
      site({
        id: "shohi",
        name: "Shohi-Zinda",
        prominence: "SECONDARY",
        ...SHOHI,
      }),
      site({
        id: "imom",
        name: "Imom al-Buxoriy Majmuasi",
        prominence: "SECONDARY",
        ...IMOM,
      }),
    ];

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 3,
      candidates,
    });

    expect(result.placedSiteIds).toContain("imom");
    const dayStarts = result.days.map(
      (d) => d.slots.find((s) => s.status === "PLACED")?.siteId ?? null,
    );
    // Last day reserved for day-trip open.
    expect(dayStarts[2]).toBe("imom");
  });

  it("2-day plan does not reserve a day-trip start (Imom stays unreachable)", () => {
    // Enough PRIMARYs to fill both day-starts; without a reservation Imom
    // never opens a day and cannot join as slot 2+ (leg cap).
    const candidates = [
      site({ id: "registon", name: "Registon", prominence: "PRIMARY", ...REGISTON }),
      site({ id: "guri", name: "Guri Amir", prominence: "PRIMARY", ...GURI }),
      site({ id: "p2", name: "Primary C", prominence: "PRIMARY", lat: REGISTON.lat + 0.003, lng: REGISTON.lng }),
      site({ id: "p3", name: "Primary D", prominence: "PRIMARY", lat: REGISTON.lat, lng: REGISTON.lng + 0.003 }),
      site({ id: "imom", name: "Imom", prominence: "SECONDARY", ...IMOM }),
    ];
    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates,
    });
    expect(result.placedSiteIds).not.toContain("imom");
    const starts = result.days.map(
      (d) => d.slots.find((s) => s.status === "PLACED")?.siteId ?? null,
    );
    expect(starts.every((id) => id != null && id !== "imom")).toBe(true);
    expect(starts.every((id) => id?.startsWith("p") || id === "guri" || id === "registon")).toBe(true);
  });

  it("4-day plan can reserve two day-trip starts for two far sites", () => {
    const FAR_B = { lat: 39.9, lng: 66.9 };
    const candidates = [
      site({ id: "registon", name: "Registon", prominence: "PRIMARY", ...REGISTON }),
      site({ id: "guri", name: "Guri Amir", prominence: "PRIMARY", ...GURI }),
      site({ id: "shohi", name: "Shohi", prominence: "PRIMARY", ...SHOHI }),
      site({ id: "imom", name: "Imom", prominence: "SECONDARY", ...IMOM }),
      site({ id: "far-b", name: "Far B", prominence: "SECONDARY", ...FAR_B }),
    ];
    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 4,
      candidates,
    });
    const starts = result.days.map(
      (d) => d.slots.find((s) => s.status === "PLACED")?.siteId ?? null,
    );
    expect(new Set(starts.slice(2))).toEqual(new Set(["imom", "far-b"]));
    expect(result.placedSiteIds).toContain("imom");
    expect(result.placedSiteIds).toContain("far-b");
  });
});
