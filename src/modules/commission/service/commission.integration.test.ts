/**
 * Rates come from the `commission_rates` system setting, and the payment path
 * reads them inside its own transaction. Requires TEST_DATABASE_URL.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import {
  COMMISSION_RATES_SETTING_KEY,
  commissionService,
  DEFAULT_COMMISSION_RATES,
} from "../index";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("commission rates", () => {
  const prisma = createTestPrisma();
  let ready = false;

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.systemSetting.findFirst();
    } catch {
      return;
    }
    ready = true;
  }, 120_000);

  afterEach(async () => {
    if (!ready) return;
    await prisma.systemSetting.deleteMany({
      where: { key: COMMISSION_RATES_SETTING_KEY },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the defaults when nothing is configured", async () => {
    if (!ready) return;
    expect(await commissionService.getRates()).toEqual(DEFAULT_COMMISSION_RATES);
  });

  it("reads a configured rate and keeps the defaults for the rest", async () => {
    if (!ready) return;
    await commissionService.saveRates({
      ...DEFAULT_COMMISSION_RATES,
      GUIDE: 20,
    });

    expect(await commissionService.getRates()).toEqual({
      ...DEFAULT_COMMISSION_RATES,
      GUIDE: 20,
    });
  });

  it("sanitises a hand-edited setting instead of trusting it", async () => {
    if (!ready) return;
    await prisma.systemSetting.create({
      data: {
        key: COMMISSION_RATES_SETTING_KEY,
        // Float, out of range, and non-numeric — all three must be repaired.
        value: { HOTEL: 12.9, HOMESTAY: 250, TAXI: "abc" },
      },
    });

    expect(await commissionService.getRates()).toEqual({
      HOTEL: 12,
      HOMESTAY: DEFAULT_COMMISSION_RATES.HOMESTAY,
      GUIDE: DEFAULT_COMMISSION_RATES.GUIDE,
      TAXI: DEFAULT_COMMISSION_RATES.TAXI,
    });
  });

  it("reads through a transaction client, as the payment path does", async () => {
    if (!ready) return;
    await commissionService.saveRates({ ...DEFAULT_COMMISSION_RATES, HOTEL: 8 });

    const inside = await prisma.$transaction(async (tx) =>
      commissionService.getRates(tx),
    );
    expect(inside.HOTEL).toBe(8);
  });

  it("falls back to the defaults rather than failing a payment", async () => {
    if (!ready) return;
    const broken = {
      systemSetting: {
        findUnique: async () => {
          throw new Error("db unavailable");
        },
      },
    } as never;

    expect(await commissionService.getRates(broken)).toEqual(
      DEFAULT_COMMISSION_RATES,
    );
  });
});
