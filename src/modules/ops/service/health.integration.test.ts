/**
 * /api/health must reflect the workers, not just `SELECT 1`.
 * Requires TEST_DATABASE_URL.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import { healthService, WORKERS } from "../index";
import { heartbeatKey } from "../repository/ops.repository";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("health check", () => {
  const prisma = createTestPrisma();
  let ready = false;

  const heartbeatKeys = [
    heartbeatKey(WORKERS.outboxRelay),
    heartbeatKey(WORKERS.expiryCron),
  ];

  async function beatAt(worker: string, at: Date) {
    // updatedAt is @updatedAt, so it has to be forced with raw SQL.
    await healthService.recordWorkerRun(worker);
    await prisma.$executeRawUnsafe(
      `UPDATE SystemSetting SET updatedAt = ? WHERE \`key\` = ?`,
      at,
      heartbeatKey(worker),
    );
  }

  /** Both workers healthy, so a test can isolate the component it cares about. */
  async function beatAllFresh() {
    await beatAt(WORKERS.outboxRelay, new Date());
    await beatAt(WORKERS.expiryCron, new Date());
  }

  function component(report: Awaited<ReturnType<typeof healthService.check>>, name: string) {
    const found = report.components.find((c) => c.name === name);
    expect(found, `missing component ${name}`).toBeDefined();
    return found!;
  }

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.outboxEvent.findFirst();
    } catch {
      return;
    }
    ready = true;
  }, 120_000);

  afterEach(async () => {
    if (!ready) return;
    await prisma.outboxEvent.deleteMany({
      where: { aggregateType: "HealthTest" },
    });
    await prisma.systemSetting.deleteMany({ where: { key: { in: heartbeatKeys } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("reports ok when both workers have beaten recently and the outbox is clear", async () => {
    if (!ready) return;
    await beatAllFresh();

    const report = await healthService.check();
    expect(component(report, "database").status).toBe("ok");
    expect(component(report, "outbox").status).toBe("ok");
    expect(component(report, "outbox-relay").status).toBe("ok");
    expect(component(report, "expiry-cron").status).toBe("ok");
  });

  it("reports unhealthy when an old unprocessed outbox row is sitting there", async () => {
    if (!ready) return;
    await beatAllFresh();

    const stale = new Date(Date.now() - 30 * 60_000);
    await prisma.outboxEvent.create({
      data: {
        aggregateType: "HealthTest",
        aggregateId: "stalled",
        eventType: "HEALTH_TEST",
        payload: {},
        status: "PENDING",
        createdAt: stale,
        availableAt: stale,
      },
    });

    const report = await healthService.check();
    const outbox = component(report, "outbox");
    expect(outbox.status).toBe("unhealthy");
    expect(outbox.detail).toContain("unprocessed");
    expect(outbox.metrics?.oldestDueAgeSeconds).toBeGreaterThan(60);
    expect(report.status).toBe("unhealthy");
  });

  it("ignores a pending row that is still waiting on its retry backoff", async () => {
    if (!ready) return;
    await beatAllFresh();

    const stale = new Date(Date.now() - 30 * 60_000);
    await prisma.outboxEvent.create({
      data: {
        aggregateType: "HealthTest",
        aggregateId: "backing-off",
        eventType: "HEALTH_TEST",
        payload: {},
        status: "PENDING",
        attempts: 3,
        createdAt: stale,
        availableAt: new Date(Date.now() + 60_000),
      },
    });

    const report = await healthService.check();
    expect(component(report, "outbox").status).toBe("ok");
  });

  it("degrades on exhausted outbox events even with nothing pending", async () => {
    if (!ready) return;
    await beatAllFresh();

    await prisma.outboxEvent.create({
      data: {
        aggregateType: "HealthTest",
        aggregateId: "dead",
        eventType: "HEALTH_TEST",
        payload: {},
        status: "FAILED",
      },
    });

    const outbox = component(await healthService.check(), "outbox");
    expect(outbox.status).toBe("degraded");
    expect(outbox.metrics?.failed).toBeGreaterThanOrEqual(1);
  });

  it("escalates a silent expiry cron from degraded to unhealthy", async () => {
    if (!ready) return;
    await beatAt(WORKERS.outboxRelay, new Date());

    await beatAt(WORKERS.expiryCron, new Date(Date.now() - 6 * 60_000));
    expect(component(await healthService.check(), "expiry-cron").status).toBe(
      "degraded",
    );

    await beatAt(WORKERS.expiryCron, new Date(Date.now() - 20 * 60_000));
    const report = await healthService.check();
    expect(component(report, "expiry-cron").status).toBe("unhealthy");
    expect(report.status).toBe("unhealthy");
  });

  it("treats a host that has never run the cron as degraded, not broken", async () => {
    if (!ready) return;
    await prisma.systemSetting.deleteMany({ where: { key: { in: heartbeatKeys } } });

    const report = await healthService.check();
    expect(component(report, "expiry-cron").status).toBe("degraded");
    expect(component(report, "expiry-cron").detail).toBe("no run recorded yet");
    expect(report.status).not.toBe("unhealthy");
  });
});
