import { describe, expect, it } from "vitest";
import {
  evaluatePublishEligibility,
  formatPublishBlockedMessage,
  hasUsableOpeningHours,
  isDiningCategory,
  type PublishSiteSnapshot,
} from "./publishPolicy";

const usableHours = {
  weekly: {
    mon: [["10:00", "22:00"]],
  },
  raw: "10:00 - 22:00",
};

const plannerDining = {
  cuisine: ["uzbek"],
  priceBand: "orta" as const,
  mealTypes: ["tushlik", "kechki"] as const,
  mustTry: ["osh"],
};

function baseLandmark(
  overrides: Partial<PublishSiteSnapshot> = {},
): PublishSiteSnapshot {
  return {
    status: "DRAFT",
    category: "OBIDA",
    sourceUrl: "https://example.org/registon",
    lat: 39.65,
    lng: 66.97,
    openingHours: usableHours,
    dining: null,
    prominence: "PRIMARY",
    ...overrides,
  };
}

function baseDining(
  overrides: Partial<PublishSiteSnapshot> = {},
): PublishSiteSnapshot {
  return {
    status: "DRAFT",
    category: "RESTORAN",
    sourceUrl: "https://www.google.com/maps?cid=1",
    lat: 39.68,
    lng: 66.98,
    openingHours: usableHours,
    dining: plannerDining,
    prominence: "OPTIONAL",
    ...overrides,
  };
}

describe("isDiningCategory", () => {
  it("marks RESTORAN / CHAYXONA / KAFE only", () => {
    expect(isDiningCategory("RESTORAN")).toBe(true);
    expect(isDiningCategory("CHAYXONA")).toBe(true);
    expect(isDiningCategory("KAFE")).toBe(true);
    expect(isDiningCategory("BOSHQA")).toBe(false);
    expect(isDiningCategory("OBIDA")).toBe(false);
  });
});

describe("hasUsableOpeningHours", () => {
  it("requires at least one weekday with a non-empty range", () => {
    expect(hasUsableOpeningHours(usableHours)).toBe(true);
    expect(hasUsableOpeningHours({ weekly: {} })).toBe(false);
    expect(hasUsableOpeningHours({ weekly: { mon: [] } })).toBe(false);
    expect(hasUsableOpeningHours(null)).toBe(false);
    expect(hasUsableOpeningHours({ raw: "unknown" })).toBe(false);
  });
});

describe("evaluatePublishEligibility", () => {
  it("allows a complete landmark DRAFT", () => {
    expect(evaluatePublishEligibility(baseLandmark())).toEqual({
      ok: true,
      reasons: [],
    });
  });

  it("allows REVIEW when fields are complete", () => {
    expect(
      evaluatePublishEligibility(baseLandmark({ status: "REVIEW" })),
    ).toEqual({ ok: true, reasons: [] });
  });

  it("allows complete dining with planner-grade dining JSON", () => {
    expect(evaluatePublishEligibility(baseDining())).toEqual({
      ok: true,
      reasons: [],
    });
    expect(
      evaluatePublishEligibility(baseDining({ category: "CHAYXONA" })),
    ).toEqual({ ok: true, reasons: [] });
  });

  it("blocks Contabo-style incomplete dining (null priceBand / mealTypes, no hours/prominence)", () => {
    const result = evaluatePublishEligibility(
      baseDining({
        openingHours: null,
        prominence: null,
        dining: {
          mealTypes: null,
          cuisine: null,
          mustTry: null,
          priceBand: null,
          note: "Maps cid only",
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "missing_opening_hours",
        "missing_prominence",
        "dining_incomplete",
      ]),
    );
  });

  it("blocks dining when mealTypes empty even if priceBand set", () => {
    const result = evaluatePublishEligibility(
      baseDining({
        dining: {
          cuisine: [],
          priceBand: "orta",
          mealTypes: [],
          mustTry: [],
        },
      }),
    );
    expect(result.reasons).toContain("dining_incomplete");
  });

  it("BOSHQA uses the same base gates — no auto-publish shortcut", () => {
    const complete = evaluatePublishEligibility(
      baseLandmark({ category: "BOSHQA", prominence: "SECONDARY" }),
    );
    expect(complete).toEqual({ ok: true, reasons: [] });

    const thin = evaluatePublishEligibility(
      baseLandmark({
        category: "BOSHQA",
        sourceUrl: "",
        openingHours: null,
        prominence: null,
      }),
    );
    expect(thin.ok).toBe(false);
    expect(thin.reasons).toEqual(
      expect.arrayContaining([
        "missing_source_url",
        "missing_opening_hours",
        "missing_prominence",
      ]),
    );
  });

  it("blocks dining JSON on non-dining including BOSHQA", () => {
    const boshqa = evaluatePublishEligibility(
      baseLandmark({ category: "BOSHQA", dining: plannerDining }),
    );
    expect(boshqa.reasons).toContain("dining_on_nondining");

    const obida = evaluatePublishEligibility(
      baseLandmark({ dining: plannerDining }),
    );
    expect(obida.reasons).toContain("dining_on_nondining");
  });

  it("blocks empty sourceUrl, missing coordinates, already published, archived", () => {
    expect(
      evaluatePublishEligibility(baseLandmark({ sourceUrl: "  " })).reasons,
    ).toContain("missing_source_url");
    expect(
      evaluatePublishEligibility(baseLandmark({ lat: null })).reasons,
    ).toContain("missing_coordinates");
    expect(
      evaluatePublishEligibility(baseLandmark({ status: "PUBLISHED" })).reasons,
    ).toContain("already_published");
    expect(
      evaluatePublishEligibility(baseLandmark({ status: "ARCHIVED" })).reasons,
    ).toContain("archived");
  });
});

describe("formatPublishBlockedMessage", () => {
  it("lists reasons for ops", () => {
    expect(
      formatPublishBlockedMessage("lyabi-house", [
        "dining_incomplete",
        "missing_prominence",
      ]),
    ).toBe(
      'Site "lyabi-house" cannot be PUBLISHED: dining_incomplete, missing_prominence',
    );
  });
});
