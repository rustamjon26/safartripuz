import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMaxIntraDayLegKm,
  MAX_INTRA_DAY_LEG_KM,
  resetMaxIntraDayLegKmWarnStateForTests,
} from "./maxIntraDayLegKm";
import { orderCandidatesForSlot, scheduleDays } from "./schedule";
import type { ScheduleCandidateInput } from "./types";
import type { OpeningHours } from "@/src/modules/knowledge";

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

/** ~1° lat ≈ 111 km; place candidates at known km north of hub. */
function offsetNorth(hubLat: number, hubLng: number, km: number): {
  lat: number;
  lng: number;
} {
  return { lat: hubLat + km / 111, lng: hubLng };
}

afterEach(() => {
  resetMaxIntraDayLegKmWarnStateForTests();
  vi.restoreAllMocks();
});

describe("getMaxIntraDayLegKm", () => {
  it("keeps samarqand exactly at the locked 12 km regression guard", () => {
    expect(MAX_INTRA_DAY_LEG_KM).toBe(12);
    expect(getMaxIntraDayLegKm("samarqand")).toBe(12);
    expect(getMaxIntraDayLegKm("Samarqand")).toBe(12);
  });

  it("returns buxoro (proposed) / xiva (confirmed) values distinct from samarqand", () => {
    expect(getMaxIntraDayLegKm("buxoro")).toBe(7);
    expect(getMaxIntraDayLegKm("xiva")).toBe(3);
    expect(getMaxIntraDayLegKm("buxoro")).not.toBe(getMaxIntraDayLegKm("samarqand"));
    expect(getMaxIntraDayLegKm("xiva")).not.toBe(getMaxIntraDayLegKm("samarqand"));
  });

  it("falls back to 12 for unmapped regionCode and warns (does not throw)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => getMaxIntraDayLegKm("andijon")).not.toThrow();
    expect(getMaxIntraDayLegKm("andijon")).toBe(12);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/unmapped regionCode "andijon"/);
    // once-per-process dedupe
    expect(getMaxIntraDayLegKm("andijon")).toBe(12);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("region-aware intra-day leg filter", () => {
  const hub = { lat: 39.77, lng: 64.42 };
  const near5 = offsetNorth(hub.lat, hub.lng, 5);
  const mid10 = offsetNorth(hub.lat, hub.lng, 10);

  const pool: ScheduleCandidateInput[] = [
    site({
      id: "hub",
      name: "Hub",
      prominence: "PRIMARY",
      ...hub,
    }),
    site({
      id: "near5",
      name: "Near Five",
      prominence: "SECONDARY",
      ...near5,
    }),
    site({
      id: "mid10",
      name: "Mid Ten",
      prominence: "SECONDARY",
      ...mid10,
    }),
  ];

  it("same candidate pool: samarqand admits 5+10 km; buxoro admits 5 only; xiva admits neither", () => {
    const last = pool[0]!;
    const rest = pool.slice(1);

    const sam = orderCandidatesForSlot(
      rest,
      last,
      getMaxIntraDayLegKm("samarqand"),
    ).map((c) => c.id);
    const bux = orderCandidatesForSlot(
      rest,
      last,
      getMaxIntraDayLegKm("buxoro"),
    ).map((c) => c.id);
    const xiv = orderCandidatesForSlot(
      rest,
      last,
      getMaxIntraDayLegKm("xiva"),
    ).map((c) => c.id);

    expect(sam).toEqual(["near5", "mid10"]);
    expect(bux).toEqual(["near5"]);
    expect(xiv).toEqual([]);
    expect(bux).not.toEqual(sam);
    expect(xiv).not.toEqual(sam);
  });

  /**
   * Fixed-seed Samarqand regression: with regionCode samarqand the placed
   * sequence must match the pre-map behavior (threshold 12 unchanged).
   */
  it("samarqand fixed-seed trip keeps identical placed candidate order", () => {
    const REGISTON = { lat: 39.6546466, lng: 66.9757669 };
    const SHOHI = { lat: 39.6621368, lng: 66.9879377 };
    const GURI = { lat: 39.6485469, lng: 66.9692492 };
    const IMOM = { lat: 39.8151972, lng: 66.9445556 };
    const AQSAROY = { lat: 39.6479388, lng: 66.9698788 };
    const RUXOBOD = { lat: 39.6508246, lng: 66.9681957 };

    const candidates = [
      site({
        id: "registon",
        name: "Registon",
        prominence: "PRIMARY",
        ...REGISTON,
      }),
      site({
        id: "guri",
        name: "Guri Amir",
        prominence: "PRIMARY",
        ...GURI,
      }),
      site({
        id: "aqsaroy",
        name: "Aqsaroy",
        prominence: "SECONDARY",
        ...AQSAROY,
      }),
      site({
        id: "shohi",
        name: "Shohi-Zinda",
        prominence: "SECONDARY",
        ...SHOHI,
      }),
      site({
        id: "ruxobod",
        name: "Ruxobod",
        prominence: "SECONDARY",
        ...RUXOBOD,
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

    const sequences = result.days.map((d) =>
      d.slots.filter((s) => s.status === "PLACED").map((s) => s.siteId),
    );

    // Golden sequence captured against threshold=12 (pre-map behavior).
    // Re-tune of samarqand map value would fail this test on purpose.
    // Day 3: Imom opens as slot 1; Shohi is >12 km away → day stops at 1 PLACED.
    expect(sequences).toEqual([
      ["guri", "registon"],
      ["aqsaroy", "ruxobod"],
      ["imom"],
    ]);
  });
});
