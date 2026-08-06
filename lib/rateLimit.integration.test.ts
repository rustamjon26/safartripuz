/**
 * Rate limit counters must hold under concurrency and survive a process
 * restart, since they exist to stop brute force across PM2 processes and
 * deploys. Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import { checkRateLimit, rateLimitCount, windowStartFor } from "./rateLimit";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("checkRateLimit (shared store)", () => {
  const prisma = createTestPrisma();
  const WINDOW_MS = 60_000;
  let usable = false;

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.rateLimit.findFirst();
      usable = true;
    } catch {
      usable = false;
    }
  }, 120_000);

  beforeEach(async () => {
    if (usable) await prisma.rateLimit.deleteMany({});
  });

  afterAll(async () => {
    if (usable) await prisma.rateLimit.deleteMany({});
    await prisma.$disconnect();
  });

  it("allows exactly max attempts, then blocks", async () => {
    if (!usable) return;
    const key = `spec:sequential:${Date.now()}`;

    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      results.push(await checkRateLimit(key, 5, WINDOW_MS));
    }

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(results.slice(5)).toEqual([false, false]);
    expect(await rateLimitCount(key, WINDOW_MS)).toBe(5);
  });

  it("never exceeds the limit when requests arrive in parallel", async () => {
    if (!usable) return;
    const key = `spec:parallel:${Date.now()}`;
    const MAX = 10;
    const N = 40;

    const outcomes = await Promise.all(
      Array.from({ length: N }, () => checkRateLimit(key, MAX, WINDOW_MS)),
    );

    // The conditional UPDATE is what makes this exact, not approximate.
    expect(outcomes.filter(Boolean)).toHaveLength(MAX);
    expect(await rateLimitCount(key, WINDOW_MS)).toBe(MAX);
  });

  it("holds the boundary when several bursts race at once", async () => {
    if (!usable) return;
    const key = `spec:burst:${Date.now()}`;
    const MAX = 3;

    const burst = () =>
      Promise.all(
        Array.from({ length: 5 }, () => checkRateLimit(key, MAX, WINDOW_MS)),
      );
    const [a, b, c] = await Promise.all([burst(), burst(), burst()]);

    const allowed = [...a, ...b, ...c].filter(Boolean).length;
    expect(allowed).toBe(MAX);
  });

  it("keeps separate budgets per bucket", async () => {
    if (!usable) return;
    const stamp = Date.now();
    const a = `spec:bucket-a:${stamp}`;
    const b = `spec:bucket-b:${stamp}`;

    await Promise.all([
      checkRateLimit(a, 1, WINDOW_MS),
      checkRateLimit(b, 1, WINDOW_MS),
    ]);

    expect(await checkRateLimit(a, 1, WINDOW_MS)).toBe(false);
    expect(await checkRateLimit(b, 1, WINDOW_MS)).toBe(false);
    expect(await rateLimitCount(a, WINDOW_MS)).toBe(1);
    expect(await rateLimitCount(b, WINDOW_MS)).toBe(1);
  });

  it("survives a restart: a fresh client sees the same counter", async () => {
    if (!usable) return;
    const key = `spec:restart:${Date.now()}`;

    for (let i = 0; i < 4; i++) await checkRateLimit(key, 4, WINDOW_MS);
    expect(await checkRateLimit(key, 4, WINDOW_MS)).toBe(false);

    // Stand-in for a redeploy / second PM2 process: a brand new connection
    // with no in-process state at all.
    const restarted = createTestPrisma();
    try {
      const row = await restarted.rateLimit.findUnique({
        where: {
          bucketKey_windowStart: {
            bucketKey: key,
            windowStart: windowStartFor(Date.now(), WINDOW_MS),
          },
        },
      });
      expect(row?.count).toBe(4);
    } finally {
      await restarted.$disconnect();
    }

    // And the limit is still closed after the "restart".
    expect(await checkRateLimit(key, 4, WINDOW_MS)).toBe(false);
  });

  it("starts a fresh budget in the next window", async () => {
    if (!usable) return;
    const key = `spec:window:${Date.now()}`;
    const SHORT = 1_000;

    expect(await checkRateLimit(key, 1, SHORT)).toBe(true);
    expect(await checkRateLimit(key, 1, SHORT)).toBe(false);

    await new Promise((r) => setTimeout(r, 1_100));

    expect(await checkRateLimit(key, 1, SHORT)).toBe(true);
  });
});

describe("windowStartFor", () => {
  it("floors to the window so every process agrees", () => {
    const w = 60_000;
    const start = 1_700_000_040_000; // a window boundary

    expect(windowStartFor(start, w).getTime()).toBe(start);
    expect(windowStartFor(start + 21_234, w).getTime()).toBe(start);
    expect(windowStartFor(start + w - 1, w).getTime()).toBe(start);
    // One millisecond later is the next window, not the same one.
    expect(windowStartFor(start + w, w).getTime()).toBe(start + w);
  });
});
