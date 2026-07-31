import { describe, expect, it } from "vitest";
import { diningSchema, parseDining } from "./dining";

const valid = {
  cuisine: ["uzbek"],
  priceBand: "orta" as const,
  mealTypes: ["tushlik", "kechki"] as const,
  mustTry: ["osh"],
};

describe("diningSchema", () => {
  it("accepts a valid dining object", () => {
    expect(diningSchema.parse(valid).priceBand).toBe("orta");
  });

  it("rejects bad priceBand", () => {
    expect(
      diningSchema.safeParse({ ...valid, priceBand: "expensive" }).success,
    ).toBe(false);
  });
});

describe("parseDining", () => {
  it("returns null for garbage", () => {
    expect(parseDining(null)).toBeNull();
    expect(parseDining({ averagePrice: 50000 })).toBeNull();
  });
});
