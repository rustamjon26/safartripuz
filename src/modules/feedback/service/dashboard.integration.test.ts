/**
 * The support dashboard payload must be the real ticket state — including all
 * zeros when there is nothing, which is what the pages now render instead of
 * demo KPIs. Requires TEST_DATABASE_URL.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import { feedbackService } from "../index";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("feedback dashboard", () => {
  const prisma = createTestPrisma();
  const tag = `dash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let ready = false;

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.feedbackTicket.findFirst();
    } catch {
      return;
    }
    // Start from a clean inbox — overview() counts every ticket in the table.
    await prisma.feedbackReply.deleteMany({});
    await prisma.feedbackTicket.deleteMany({});
    ready = true;
  }, 120_000);

  afterEach(async () => {
    if (!ready) return;
    await prisma.feedbackReply.deleteMany({});
    await prisma.feedbackTicket.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedTicket(input: {
    rating: number;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    createdAt: Date;
    body?: string;
    channel?: "hotel" | "guide" | "taxi" | "homestay" | "direct";
  }) {
    return prisma.feedbackTicket.create({
      data: {
        channel: input.channel ?? "hotel",
        sourceType: "Direct",
        sourceId: `${tag}_${Math.random().toString(36).slice(2, 10)}`,
        authorName: "Test Mehmon",
        rating: input.rating,
        body: input.body ?? "kutish vaqti juda uzoq edi",
        sentiment: input.sentiment,
        status: "OPEN",
        createdAt: input.createdAt,
      },
    });
  }

  it("reports honest zeros on an empty inbox instead of demo numbers", async () => {
    if (!ready) return;

    const dashboard = await feedbackService.dashboard(30);

    expect(dashboard.overview.total).toBe(0);
    expect(dashboard.overview.avgRating).toBe(0);
    expect(dashboard.overview.responseRate).toBe(0);
    expect(dashboard.recent).toEqual([]);
    expect(dashboard.positiveKeywords).toEqual([]);
    expect(dashboard.negativeKeywords).toEqual([]);
    expect(dashboard.improvements).toEqual([]);

    // Every channel is present but with a zero score and zero sample size.
    expect(dashboard.channels.every((c) => c.sampleSize === 0 && c.brand === 0)).toBe(
      true,
    );

    // The trend still spans the window, all buckets empty.
    expect(dashboard.trend).toHaveLength(dashboard.trendDays);
    expect(
      dashboard.trend.every((p) => p.positive === 0 && p.negative === 0),
    ).toBe(true);
  });

  it("counts real tickets into the trend and the KPIs", async () => {
    if (!ready) return;

    const today = new Date();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    await seedTicket({ rating: 5, sentiment: "POSITIVE", createdAt: today });
    await seedTicket({ rating: 5, sentiment: "POSITIVE", createdAt: today });
    await seedTicket({ rating: 1, sentiment: "NEGATIVE", createdAt: twoDaysAgo });

    const dashboard = await feedbackService.dashboard(30);

    expect(dashboard.overview.total).toBe(3);
    expect(dashboard.overview.avgRating).toBeCloseTo(3.7, 1);
    expect(dashboard.recent).toHaveLength(3);

    const totalPositive = dashboard.trend.reduce((sum, p) => sum + p.positive, 0);
    const totalNegative = dashboard.trend.reduce((sum, p) => sum + p.negative, 0);
    expect(totalPositive).toBe(2);
    expect(totalNegative).toBe(1);

    const hotel = dashboard.channels.find((c) => c.key === "hotel");
    expect(hotel?.sampleSize).toBe(3);
    expect(hotel?.brand).toBeGreaterThan(0);
  });

  it("caps the trend window so a 90-day report stays readable", async () => {
    if (!ready) return;
    const dashboard = await feedbackService.dashboard(90);
    expect(dashboard.days).toBe(90);
    expect(dashboard.trendDays).toBe(14);
    expect(dashboard.trend).toHaveLength(14);
  });
});
