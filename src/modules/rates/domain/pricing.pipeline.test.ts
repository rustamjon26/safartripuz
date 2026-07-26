import { describe, expect, it } from "vitest";
import {
  applySeasonalOverride,
  resolveBaseRate,
  runPricingPipeline,
} from "./pricing";
import { selectStackablePromotions } from "./stacking";
import type { PricingInput, PromotionRule } from "./types";

function baseInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    roomCount: 1,
    nightBases: [
      { date: "2026-07-01", baseTiyin: 100_000n },
      { date: "2026-07-02", baseTiyin: 100_000n },
      { date: "2026-07-03", baseTiyin: 100_000n },
      { date: "2026-07-04", baseTiyin: 100_000n },
    ],
    seasonalOverrides: [],
    losRules: [],
    occupancy: {
      adults: 2,
      children: 0,
      includedAdults: 2,
      includedChildren: 0,
    },
    promotions: [],
    taxFeeRules: [],
    ...overrides,
  };
}

describe("pricing stages", () => {
  it("resolveBaseRate sets nightly base", () => {
    const state = resolveBaseRate(baseInput());
    expect(state.nights).toHaveLength(4);
    expect(state.nights[0]!.netTiyin).toBe(100_000n);
  });

  it("applySeasonalOverride replaces nights in range", () => {
    const state = resolveBaseRate(
      baseInput({
        seasonalOverrides: [
          {
            startDate: "2026-07-02",
            endDate: "2026-07-03",
            priceTiyin: 150_000n,
          },
        ],
      }),
    );
    const next = applySeasonalOverride(
      state,
      baseInput({
        seasonalOverrides: [
          {
            startDate: "2026-07-02",
            endDate: "2026-07-03",
            priceTiyin: 150_000n,
          },
        ],
      }),
    );
    expect(next.nights[0]!.netTiyin).toBe(100_000n);
    expect(next.nights[1]!.netTiyin).toBe(150_000n);
    expect(next.nights[2]!.netTiyin).toBe(150_000n);
  });
});

describe("promo stacking", () => {
  it("same stackGroup keeps higher priority (lower number) only", () => {
    const promos: PromotionRule[] = [
      {
        id: "a",
        stackGroup: "CODE",
        priority: 1,
        combinableWith: [],
        discountType: "PERCENT_BPS",
        discountValue: 1000n,
      },
      {
        id: "b",
        stackGroup: "CODE",
        priority: 2,
        combinableWith: [],
        discountType: "PERCENT_BPS",
        discountValue: 2000n,
      },
    ];
    const selected = selectStackablePromotions(promos);
    expect(selected.map((p) => p.id)).toEqual(["a"]);
  });

  it("combinable groups both apply", () => {
    const promos: PromotionRule[] = [
      {
        id: "a",
        stackGroup: "A",
        priority: 1,
        combinableWith: ["B"],
        discountType: "FIXED_TIYIN",
        discountValue: 1000n,
      },
      {
        id: "b",
        stackGroup: "B",
        priority: 2,
        combinableWith: ["A"],
        discountType: "FIXED_TIYIN",
        discountValue: 2000n,
      },
    ];
    expect(selectStackablePromotions(promos).map((p) => p.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("e2e multi-night season + promo + tax", () => {
  it("4-night stay with nights 2-3 overridden, promo, tax", () => {
    const quote = runPricingPipeline(
      baseInput({
        seasonalOverrides: [
          {
            startDate: "2026-07-02",
            endDate: "2026-07-03",
            priceTiyin: 120_000n,
          },
        ],
        promotions: [
          {
            id: "p1",
            stackGroup: "PROMO",
            priority: 1,
            combinableWith: [],
            discountType: "PERCENT_BPS",
            discountValue: 1000n, // 10%
          },
        ],
        taxFeeRules: [
          {
            id: "vat",
            name: "VAT",
            type: "PERCENT_BPS",
            value: 1200n, // 12%
            sortOrder: 1,
          },
        ],
      }),
    );
    expect(quote.nights).toHaveLength(4);
    expect(quote.totalTiyin > 0n).toBe(true);
    // No float in pipeline totals
    expect(typeof quote.totalTiyin).toBe("bigint");
  });

  it("roomCount multiplies total", () => {
    const one = runPricingPipeline(baseInput({ roomCount: 1 }));
    const two = runPricingPipeline(baseInput({ roomCount: 2 }));
    expect(two.totalTiyin).toBe(one.totalTiyin * 2n);
  });
});
