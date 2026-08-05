import { describe, expect, it } from "vitest";
import {
  buildImprovements,
  buildMarketCompare,
  buildSentimentTrend,
  priorityFromCount,
  ratingToScore,
  tokenizeFeedbackBody,
  topKeywords,
} from "./reports";

describe("buildSentimentTrend", () => {
  const now = new Date("2026-03-10T09:00:00.000Z");

  it("emits one bucket per day, ending today", () => {
    const trend = buildSentimentTrend([], { days: 3, now });
    expect(trend.map((p) => p.date)).toEqual([
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
    expect(trend[0].label).toBe("08.03");
  });

  it("counts a day with no feedback as zero rather than dropping it", () => {
    const trend = buildSentimentTrend(
      [
        { createdAt: new Date("2026-03-08T05:00:00.000Z"), sentiment: "POSITIVE" },
        { createdAt: new Date("2026-03-10T23:59:59.000Z"), sentiment: "NEGATIVE" },
      ],
      { days: 3, now },
    );
    expect(trend).toEqual([
      { date: "2026-03-08", label: "08.03", positive: 1, neutral: 0, negative: 0 },
      { date: "2026-03-09", label: "09.03", positive: 0, neutral: 0, negative: 0 },
      { date: "2026-03-10", label: "10.03", positive: 0, neutral: 0, negative: 1 },
    ]);
  });

  it("buckets by UTC day so the series does not shift with the server timezone", () => {
    const original = process.env.TZ;
    process.env.TZ = "Asia/Tashkent";
    try {
      // 23:30 UTC is already the next calendar day in Tashkent (+5).
      const trend = buildSentimentTrend(
        [{ createdAt: new Date("2026-03-09T23:30:00.000Z"), sentiment: "NEUTRAL" }],
        { days: 3, now },
      );
      expect(trend.find((p) => p.date === "2026-03-09")?.neutral).toBe(1);
      expect(trend.find((p) => p.date === "2026-03-10")?.neutral).toBe(0);
    } finally {
      process.env.TZ = original;
    }
  });

  it("ignores rows outside the window", () => {
    const trend = buildSentimentTrend(
      [{ createdAt: new Date("2026-01-01T00:00:00.000Z"), sentiment: "POSITIVE" }],
      { days: 3, now },
    );
    expect(trend.every((p) => p.positive === 0)).toBe(true);
  });
});

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
