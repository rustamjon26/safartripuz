import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/src/modules/knowledge";
import { haversine } from "./distance";
import {
  MAX_INTRA_DAY_LEG_KM,
  scheduleDays,
  SLOTS_PER_DAY,
} from "./schedule";
import type { ScheduleCandidateInput, ScheduleResult } from "./types";

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

/** Real-ish coords from tourism_data.json */
const REGISTON = { lat: 39.6546466, lng: 66.9757669 };
const SHOHI = { lat: 39.6621368, lng: 66.9879377 };
const GURI = { lat: 39.6485469, lng: 66.9692492 };
const IMOM = { lat: 39.8151972, lng: 66.9445556 };
const AQSAROY = { lat: 39.6479388, lng: 66.9698788 };
const XIZR = { lat: 39.6634382, lng: 66.9832527 };
const RUXOBOD = { lat: 39.6508246, lng: 66.9681957 };

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

function byId(candidates: ScheduleCandidateInput[]): Map<string, ScheduleCandidateInput> {
  return new Map(candidates.map((c) => [c.id, c]));
}

/** Max consecutive haversine km among PLACED slots within each day. */
function maxIntraDayLegKm(
  result: ScheduleResult,
  sites: Map<string, ScheduleCandidateInput>,
): number {
  let max = 0;
  for (const day of result.days) {
    const placed = day.slots.filter((s) => s.status === "PLACED" && s.siteId);
    for (let i = 1; i < placed.length; i++) {
      const a = sites.get(placed[i - 1]!.siteId!);
      const b = sites.get(placed[i]!.siteId!);
      if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
        continue;
      }
      max = Math.max(max, haversine(a.lat, a.lng, b.lat, b.lng));
    }
  }
  return max;
}

/**
 * Pre-distance selection: round-robin over prominence-ordered list (ignores geo).
 * Only builds placed site-id sequences per day for regression comparison.
 */
function legacyProminenceSequences(
  candidates: ScheduleCandidateInput[],
  dayCount: number,
): string[][] {
  const usable = [...candidates];
  const placed = new Set<string>();
  // Mirror evenSlotTargets for n usable
  const n = Math.min(usable.length, dayCount * SLOTS_PER_DAY);
  const base = Math.floor(n / dayCount);
  let rem = n % dayCount;
  const targets = Array.from({ length: dayCount }, () => base);
  for (let i = 0; i < dayCount && rem > 0; i++) {
    if (targets[i]! < SLOTS_PER_DAY) {
      targets[i]! += 1;
      rem -= 1;
    }
  }

  let cursorIdx = 0;
  const days: string[][] = [];
  for (let d = 0; d < dayCount; d++) {
    const seq: string[] = [];
    let placedToday = 0;
    while (placedToday < (targets[d] ?? 0)) {
      if (usable.every((c) => placed.has(c.id))) break;
      let placedOne = false;
      for (let attempt = 0; attempt < usable.length; attempt++) {
        if (cursorIdx >= usable.length) cursorIdx = 0;
        const c = usable[cursorIdx]!;
        cursorIdx += 1;
        if (placed.has(c.id)) continue;
        seq.push(c.id);
        placed.add(c.id);
        placedToday += 1;
        placedOne = true;
        break;
      }
      if (!placedOne) break;
    }
    days.push(seq);
  }
  return days;
}

function maxLegFromSequences(
  sequences: string[][],
  sites: Map<string, ScheduleCandidateInput>,
): number {
  let max = 0;
  for (const seq of sequences) {
    for (let i = 1; i < seq.length; i++) {
      const a = sites.get(seq[i - 1]!);
      const b = sites.get(seq[i]!);
      if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
        continue;
      }
      max = Math.max(max, haversine(a.lat, a.lng, b.lat, b.lng));
    }
  }
  return max;
}

describe("distance-aware scheduleDays", () => {
  it("does not sandwich Imom between two city sites on the same day", () => {
    const candidates = [
      site({
        id: "registon",
        name: "Registon",
        prominence: "PRIMARY",
        ...REGISTON,
      }),
      site({
        id: "imom",
        name: "Imom al-Buxoriy Majmuasi",
        prominence: "SECONDARY",
        ...IMOM,
      }),
      site({
        id: "shohi",
        name: "Shohi-Zinda",
        prominence: "SECONDARY",
        ...SHOHI,
      }),
      site({
        id: "guri",
        name: "Guri Amir",
        prominence: "PRIMARY",
        ...GURI,
      }),
    ];

    // Sanity: Imom is outside the intra-day leg budget from Registon.
    expect(haversine(REGISTON.lat, REGISTON.lng, IMOM.lat, IMOM.lng)).toBeGreaterThan(
      MAX_INTRA_DAY_LEG_KM,
    );

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates,
    });

    for (const day of result.days) {
      const placedIds = day.slots
        .filter((s) => s.status === "PLACED")
        .map((s) => s.siteId);
      const imomIdx = placedIds.indexOf("imom");
      if (imomIdx <= 0 || imomIdx >= placedIds.length - 1) continue;
      const before = placedIds[imomIdx - 1]!;
      const after = placedIds[imomIdx + 1]!;
      const city = new Set(["registon", "shohi", "guri"]);
      expect(city.has(before) && city.has(after)).toBe(false);
    }
  });

  it("when a far site opens the day, later slots stay nearby or become NO_DATA", () => {
    const nearbyImom = {
      lat: IMOM.lat + 0.01,
      lng: IMOM.lng + 0.01,
    };
    const candidates = [
      site({
        id: "imom",
        name: "Imom al-Buxoriy Majmuasi",
        prominence: "PRIMARY",
        ...IMOM,
      }),
      site({
        id: "near-imom",
        name: "Near Imom",
        prominence: "OPTIONAL",
        ...nearbyImom,
      }),
      site({
        id: "registon",
        name: "Registon",
        prominence: "OPTIONAL",
        ...REGISTON,
      }),
      site({
        id: "shohi",
        name: "Shohi-Zinda",
        prominence: "OPTIONAL",
        ...SHOHI,
      }),
    ];

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 2,
      candidates,
    });

    const day1 = result.days[0]!;
    expect(day1.slots[0]?.siteId).toBe("imom");

    const later = day1.slots.slice(1);
    for (const slot of later) {
      if (slot.status === "NO_DATA") continue;
      expect(["near-imom"]).toContain(slot.siteId);
      expect(slot.siteId).not.toBe("registon");
      expect(slot.siteId).not.toBe("shohi");
    }

    // At least one follow-up is either near-imom or NO_DATA (never city).
    expect(
      later.every(
        (s) =>
          s.status === "NO_DATA" || s.siteId === "near-imom",
      ),
    ).toBe(true);
  });

  it("same SECONDARY tier: nearer wins even when farther name sorts first", () => {
    // Prod zigzag: Aqsaroy → Xizr (~2 km) instead of Ruxobod (~350 m).
    // "Hazrati…" localeCompare before "Ruxobod…" — name must not beat distance.
    expect(haversine(AQSAROY.lat, AQSAROY.lng, RUXOBOD.lat, RUXOBOD.lng)).toBeLessThan(
      0.5,
    );
    expect(haversine(AQSAROY.lat, AQSAROY.lng, XIZR.lat, XIZR.lng)).toBeGreaterThan(1.5);
    expect(
      "Hazrati Xizr Masjidi".localeCompare("Ruxobod Maqbarasi", "en"),
    ).toBeLessThan(0);

    const candidates = [
      site({
        id: "aqsaroy",
        name: "Aqsaroy Maqbarasi",
        prominence: "SECONDARY",
        ...AQSAROY,
      }),
      site({
        id: "xizr",
        name: "Hazrati Xizr Masjidi",
        prominence: "SECONDARY",
        ...XIZR,
      }),
      site({
        id: "ruxobod",
        name: "Ruxobod Maqbarasi",
        prominence: "SECONDARY",
        ...RUXOBOD,
      }),
    ];

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 1,
      candidates,
    });

    const placed = result.days[0]!.slots
      .filter((s) => s.status === "PLACED")
      .map((s) => s.siteId);
    expect(placed[0]).toBe("aqsaroy");
    expect(placed[1]).toBe("ruxobod");
    expect(placed.slice(0, 2)).not.toContain("xizr");
  });

  it("nearby OPTIONAL does not displace a farther PRIMARY within the leg cap", () => {
    // Registon → museum ~100 m would win under nearest-first; Shohi must win.
    const museum = {
      lat: REGISTON.lat + 0.001,
      lng: REGISTON.lng + 0.001,
    };
    const candidates = [
      site({
        id: "registon",
        name: "Registon",
        prominence: "PRIMARY",
        ...REGISTON,
      }),
      site({
        id: "museum",
        name: "Registon Majmuasi Tarixi Muzeyi",
        prominence: "OPTIONAL",
        ...museum,
      }),
      site({
        id: "shohi",
        name: "Shohi Zinda",
        prominence: "PRIMARY",
        ...SHOHI,
      }),
      site({
        id: "haykal",
        name: "Amir Temur Haykali",
        prominence: "OPTIONAL",
        lat: REGISTON.lat - 0.001,
        lng: REGISTON.lng + 0.0005,
      }),
    ];

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 1,
      candidates,
    });

    const placed = result.days[0]!.slots
      .filter((s) => s.status === "PLACED")
      .map((s) => s.siteId);
    // Cap is 3/day: Registon → Shohi (PRIMARY in filter) → an OPTIONAL filler.
    expect(placed[0]).toBe("registon");
    expect(placed[1]).toBe("shohi");
    expect(placed.slice(0, 2)).not.toContain("museum");
    expect(placed.slice(0, 2)).not.toContain("haykal");
  });

  it("20 sites / 3 days: all PRIMARY placed; max leg under prominence-only baseline", () => {
    const city: ScheduleCandidateInput[] = [];
    for (let i = 0; i < 19; i++) {
      // Compact old-city cluster (~few km across); OPTIONAL packed near Registon
      const row = Math.floor(i / 5);
      const col = i % 5;
      const isPrimary = i < 5;
      city.push(
        site({
          id: `city-${i}`,
          name: `City ${String(i).padStart(2, "0")}`,
          prominence: isPrimary ? "PRIMARY" : i < 12 ? "SECONDARY" : "OPTIONAL",
          lat: isPrimary
            ? REGISTON.lat + row * 0.004
            : REGISTON.lat + (i % 3) * 0.0008,
          lng: isPrimary
            ? REGISTON.lng + col * 0.004
            : REGISTON.lng + (i % 4) * 0.0008,
        }),
      );
    }
    const primaryIds = city
      .filter((c) => c.prominence === "PRIMARY")
      .map((c) => c.id);
    expect(primaryIds).toHaveLength(5);

    const candidates = [
      ...city,
      // Far SECONDARY — reserved day-3 start (day-trip), not mid-plan sandwich.
      site({
        id: "imom",
        name: "AAA Imom Far",
        prominence: "SECONDARY",
        ...IMOM,
      }),
    ];
    // Prominence-sorted like the repository
    candidates.sort((a, b) => {
      const rank = (p: typeof a.prominence) =>
        p === "PRIMARY" ? 0 : p === "SECONDARY" ? 1 : 2;
      const d = rank(a.prominence) - rank(b.prominence);
      return d !== 0 ? d : a.name.localeCompare(b.name, "en");
    });

    const sites = byId(candidates);
    const legacyMax = maxLegFromSequences(
      legacyProminenceSequences(candidates, 3),
      sites,
    );

    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 6, 27),
      dayCount: 3,
      candidates,
    });
    const newMax = maxIntraDayLegKm(result, sites);
    const placed = new Set(result.placedSiteIds);

    for (const id of primaryIds) {
      expect(placed.has(id)).toBe(true);
    }
    // Day-trip reservation: Imom opens day 3 instead of staying unreachable.
    expect(placed.has("imom")).toBe(true);
    const day3Start = result.days[2]!.slots.find(
      (s) => s.status === "PLACED",
    )?.siteId;
    expect(day3Start).toBe("imom");
    expect(legacyMax).toBeGreaterThan(MAX_INTRA_DAY_LEG_KM);
    expect(newMax).toBeLessThan(legacyMax);
    expect(newMax).toBeLessThanOrEqual(MAX_INTRA_DAY_LEG_KM);
  });
});
