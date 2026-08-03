import { describe, expect, it } from "vitest";
import {
  responseRate,
  sentimentFromRating,
  sentimentIndex,
} from "./sentiment";

describe("sentimentFromRating", () => {
  it("maps bands", () => {
    expect(sentimentFromRating(5)).toBe("POSITIVE");
    expect(sentimentFromRating(4)).toBe("POSITIVE");
    expect(sentimentFromRating(3)).toBe("NEUTRAL");
    expect(sentimentFromRating(2)).toBe("NEGATIVE");
    expect(sentimentFromRating(1)).toBe("NEGATIVE");
  });
});

describe("sentimentIndex / responseRate", () => {
  it("computes percentages safely", () => {
    expect(sentimentIndex({ positive: 8, neutral: 1, negative: 1 })).toBe(80);
    expect(sentimentIndex({ positive: 0, neutral: 0, negative: 0 })).toBe(0);
    expect(responseRate(10, 9)).toBe(90);
    expect(responseRate(0, 0)).toBe(0);
  });
});
