import { describe, expect, it } from "vitest";
import {
  buildImprovements,
  buildMarketCompare,
  priorityFromCount,
  ratingToScore,
  tokenizeFeedbackBody,
  topKeywords,
} from "./reports";

describe("ratingToScore", () => {
  it("maps 1–5 stars to 0–100", () => {
    expect(ratingToScore(5)).toBe(100);
    expect(ratingToScore(4.5)).toBe(90);
    expect(ratingToScore(0)).toBe(0);
  });
});

describe("tokenizeFeedbackBody / topKeywords", () => {
  it("skips short tokens and stopwords", () => {
    const tokens = tokenizeFeedbackBody("va juda yaxshi mehmondo'stlik xizmati");
    expect(tokens).toContain("mehmondo'stlik");
    expect(tokens).not.toContain("va");
  });

  it("ranks repeated keywords", () => {
    const top = topKeywords(
      [
        "Kutish vaqti juda uzoq edi",
        "Kutish vaqti muammo",
        "WiFi tezligi past",
      ],
      5,
    );
    expect(top[0]?.word).toMatch(/kutish|vaqti|wifi|tezligi/);
    expect(top[0]?.count).toBeGreaterThanOrEqual(1);
  });
});

describe("buildMarketCompare", () => {
  it("includes overall + channel rows with market baselines", () => {
    const rows = buildMarketCompare(
      [{ channel: "hotel", avgRating: 4.5, count: 10 }],
      4.2,
      12,
    );
    expect(rows[0]?.key).toBe("all");
    expect(rows[0]?.brand).toBe(84);
    const hotel = rows.find((r) => r.key === "hotel");
    expect(hotel?.brand).toBe(90);
    expect(hotel?.market).toBe(78);
  });
});

describe("buildImprovements", () => {
  it("orders by count and sets priority", () => {
    expect(priorityFromCount(12)).toBe("high");
    const items = buildImprovements(
      [
        { key: "a", label: "A", count: 2, sampleBody: "kichik" },
        { key: "b", label: "B", count: 15, sampleBody: "katta muammo" },
      ],
      4,
    );
    expect(items[0]?.area).toBe("B");
    expect(items[0]?.priority).toBe("high");
  });
});
