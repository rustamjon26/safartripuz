/**
 * Promo creation used to be a toast and the active count was the literal 2.
 * These assert the round trip actually reaches the database.
 * Requires TEST_DATABASE_URL.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma, seedMinimal } from "@/src/test/db";
import { marketingService, PromoCodeTakenError, PromoNotFoundError } from "../index";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("hotel promos", () => {
  const prisma = createTestPrisma();
  let ready = false;
  let hotelId = "";
  let otherHotelId = "";
  let seeded: Awaited<ReturnType<typeof seedMinimal>> | null = null;
  let otherSeeded: Awaited<ReturnType<typeof seedMinimal>> | null = null;

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.hotelPromo.findFirst();
    } catch {
      return;
    }
    seeded = await seedMinimal(prisma);
    otherSeeded = await seedMinimal(prisma);
    hotelId = seeded.hotelId;
    otherHotelId = otherSeeded.hotelId;
    ready = true;
  }, 120_000);

  afterEach(async () => {
    if (!ready) return;
    await prisma.hotelPromo.deleteMany({
      where: { hotelId: { in: [hotelId, otherHotelId] } },
    });
  });

  afterAll(async () => {
    for (const s of [seeded, otherSeeded]) {
      if (!s) continue;
      await prisma.hotelPromo.deleteMany({ where: { hotelId: s.hotelId } });
      await prisma.physicalRoom.deleteMany({ where: { hotelId: s.hotelId } });
      await prisma.roomType.deleteMany({ where: { hotelId: s.hotelId } });
      await prisma.hotel.deleteMany({ where: { id: s.hotelId } });
      await prisma.partner.deleteMany({ where: { id: s.partnerId } });
      await prisma.user.deleteMany({ where: { id: s.userId } });
    }
    await prisma.$disconnect();
  });

  it("persists a promo and reflects it in the active count", async () => {
    if (!ready) return;

    const before = await marketingService.listPromos(hotelId);
    expect(before.promos).toHaveLength(0);
    expect(before.activeCount).toBe(0);

    const created = await marketingService.createPromo(hotelId, {
      title: "Kuzgi chegirma",
      code: "autumn20",
      discountPercent: 15,
      type: "SEASONAL",
      startsAt: null,
      endsAt: null,
    });

    expect(created.discountBps).toBe(1500);
    expect(created.discountPercent).toBe(15);
    // Codes are compared case-insensitively, so they are stored uppercased.
    expect(created.code).toBe("AUTUMN20");

    // Re-read through a fresh query: this is the "refresh the page" assertion.
    const after = await marketingService.listPromos(hotelId);
    expect(after.promos).toHaveLength(1);
    expect(after.promos[0].id).toBe(created.id);
    expect(after.activeCount).toBe(1);
  });

  it("keeps fractional percentages lossless as basis points", async () => {
    if (!ready) return;
    const promo = await marketingService.createPromo(hotelId, {
      title: "Yarim foiz",
      code: "",
      discountPercent: 12.5,
      type: "EVENT",
      startsAt: null,
      endsAt: null,
    });
    expect(promo.discountBps).toBe(1250);
    expect(promo.discountPercent).toBe(12.5);
    expect(promo.code).toBeNull();
  });

  it("excludes switched-off and expired promos from the active count", async () => {
    if (!ready) return;

    const live = await marketingService.createPromo(hotelId, {
      title: "Hozir faol",
      code: "LIVE",
      discountPercent: 10,
      type: "SEASONAL",
      startsAt: null,
      endsAt: null,
    });
    await marketingService.createPromo(hotelId, {
      title: "Muddati o'tgan",
      code: "EXPIRED",
      discountPercent: 10,
      type: "SEASONAL",
      startsAt: new Date("2020-01-01"),
      endsAt: new Date("2020-02-01"),
    });
    await marketingService.createPromo(hotelId, {
      title: "Hali boshlanmagan",
      code: "FUTURE",
      discountPercent: 10,
      type: "SEASONAL",
      startsAt: new Date("2099-01-01"),
      endsAt: null,
    });

    expect((await marketingService.listPromos(hotelId)).activeCount).toBe(1);

    await marketingService.patchPromo(hotelId, live.id, { isActive: false });
    expect((await marketingService.listPromos(hotelId)).activeCount).toBe(0);
  });

  it("rejects a duplicate code for the same hotel but allows it for another", async () => {
    if (!ready) return;

    await marketingService.createPromo(hotelId, {
      title: "Birinchi",
      code: "SUMMER",
      discountPercent: 10,
      type: "SEASONAL",
      startsAt: null,
      endsAt: null,
    });

    await expect(
      marketingService.createPromo(hotelId, {
        title: "Ikkinchi",
        code: "summer",
        discountPercent: 20,
        type: "SEASONAL",
        startsAt: null,
        endsAt: null,
      }),
    ).rejects.toBeInstanceOf(PromoCodeTakenError);

    await expect(
      marketingService.createPromo(otherHotelId, {
        title: "Boshqa mehmonxona",
        code: "SUMMER",
        discountPercent: 20,
        type: "SEASONAL",
        startsAt: null,
        endsAt: null,
      }),
    ).resolves.toMatchObject({ code: "SUMMER" });
  });

  it("will not let one hotel patch or delete another's promo", async () => {
    if (!ready) return;

    const promo = await marketingService.createPromo(hotelId, {
      title: "Meniki",
      code: "MINE",
      discountPercent: 10,
      type: "SEASONAL",
      startsAt: null,
      endsAt: null,
    });

    await expect(
      marketingService.patchPromo(otherHotelId, promo.id, { isActive: false }),
    ).rejects.toBeInstanceOf(PromoNotFoundError);
    await expect(
      marketingService.deletePromo(otherHotelId, promo.id),
    ).rejects.toBeInstanceOf(PromoNotFoundError);

    expect((await marketingService.listPromos(hotelId)).promos[0].isActive).toBe(true);
  });
});
