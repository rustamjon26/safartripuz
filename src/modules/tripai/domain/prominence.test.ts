import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/src/modules/knowledge";
import { scheduleDays, SLOTS_PER_DAY } from "./schedule";
import { compareByProminence, sortByProminence } from "./prominence";
import type { ScheduleCandidateInput } from "./types";

const open: OpeningHours = {
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

function site(
  id: string,
  name: string,
  prominence: Ranked["prominence"] = null,
): Ranked {
  return {
    id,
    name,
    lat: 39.65,
    lng: 66.96,
    openingHours: open,
    visitMinutes: 60,
    prominence,
  };
}

describe("compareByProminence", () => {
  it("orders PRIMARY before SECONDARY before null/OPTIONAL", () => {
    const ranked = sortByProminence([
      site("c", "Cee", null),
      site("a", "Aaa", "OPTIONAL"),
      site("b", "Bee", "PRIMARY"),
      site("d", "Dee", "SECONDARY"),
    ]);
    expect(ranked.map((s) => s.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("ties break by name", () => {
    expect(
      compareByProminence(
        { name: "Shohi Zinda", prominence: "PRIMARY" },
        { name: "Registon", prominence: "PRIMARY" },
      ),
    ).toBeGreaterThan(0);
  });
});

describe("prominence-aware schedule", () => {
  it("18 alphabetical sites / 3 days: PRIMARY landmarks are placed", () => {
    // Alphabetical names would otherwise fill slots with A… only (old bug).
    const alphabetical = [
      "Afrosiyob Muzeyi",
      "Afrosiyob Qadimiy Shahri",
      "Amir Temur Haykali",
      "Aqsaroy Maqbarasi",
      "Bibi-Xonim Masjidi",
      "Go'ri Amir",
      "Hazrati Xizr Masjidi",
      "Imom al-Buxoriy Majmuasi",
      "Ishratxona Maqbarasi",
      "Registon",
      "Registon Majmuasi Tarixi Muzeyi",
      "Ruxobod Maqbarasi",
      "Shohi Zinda",
      "Siyob Bozori",
      "Ulug'bek Rasadxonasi",
      "Xoja Doniyor Maqbarasi",
      "Xovrenko Vinochilik Muzeyi",
      "Islom Karimov Maqbarasi",
    ];

    const primary = new Set(["Registon", "Shohi Zinda", "Go'ri Amir"]);
    const candidates = alphabetical.map((name, i) =>
      site(
        `id-${i}`,
        name,
        primary.has(name) ? "PRIMARY" : "OPTIONAL",
      ),
    );

    const ordered = sortByProminence(candidates);
    const result = scheduleDays({
      regionDisplay: "Samarqand",
      regionCode: "samarqand",
      startDate: new Date(2026, 7, 3),
      dayCount: 3,
      candidates: ordered,
    });

    const placedNames = result.days.flatMap((d) =>
      d.slots
        .filter((s) => s.status === "PLACED")
        .map((s) => s.siteName),
    );

    expect(placedNames).toHaveLength(SLOTS_PER_DAY * 3);
    expect(placedNames).toEqual(expect.arrayContaining([...primary]));
    // Without prominence sort, first 9 A… names would win and Registon would miss.
    expect(placedNames.slice(0, 3)).toEqual(
      expect.arrayContaining(["Go'ri Amir", "Registon", "Shohi Zinda"]),
    );
  });
});
