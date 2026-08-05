/**
 * Taxi/guide expiry must happen on the cron, with nobody opening a partner page.
 * The last case shells out to the real PM2 cron entry point to prove the wiring.
 * Requires TEST_DATABASE_URL.
 */
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import { expirePendingTaxiOrders, TAXI_PENDING_TIMEOUT_MS } from "@/lib/taxi/expireOrders";
import { expireGuideBookings } from "@/lib/guide/expireBookings";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("partner booking expiry cron", () => {
  const prisma = createTestPrisma();
  const suffix = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let ready = false;
  let customerId = "";
  let guideUserId = "";
  let guestId = "";
  let partnerId = "";
  let listingId = "";

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.taxiOrder.findFirst();
    } catch {
      return;
    }

    const mkUser = (tag: string, role: "user" | "guide") =>
      prisma.user.create({
        data: {
          first_name: tag,
          last_name: "Expiry",
          email: `${tag}_${suffix}@test.local`,
          phone: `+9989${String(Date.now()).slice(-8)}${tag.length}`,
          password: "x",
          role,
        },
      });

    const customer = await mkUser("cust", "user");
    const guideUser = await mkUser("guide", "guide");
    const guest = await mkUser("guest", "user");

    const partner = await prisma.partner.create({
      data: {
        userId: guideUser.id,
        type: "guide",
        status: "approved",
        displayName: `Guide Partner ${suffix}`,
      },
    });

    const listing = await prisma.guideListing.create({
      data: {
        partnerId: partner.id,
        hostId: guideUser.id,
        title: "Expiry test tour",
        description: "test",
        language: "uz",
        category: "CITY_TOUR",
        pricePerDay: 1000000,
        pricePerHour: 150000,
        minHours: 2,
        maxHours: 8,
        maxGroupSize: 10,
        status: "ACTIVE",
      },
    });

    customerId = customer.id;
    guideUserId = guideUser.id;
    guestId = guest.id;
    partnerId = partner.id;
    listingId = listing.id;
    ready = true;
  }, 120_000);

  afterAll(async () => {
    if (ready) {
      await prisma.taxiOrderLog.deleteMany({ where: { order: { customerId } } });
      await prisma.taxiOrder.deleteMany({ where: { customerId } });
      await prisma.guideBookingLog.deleteMany({
        where: { booking: { listingId } },
      });
      await prisma.guideBlockedSlot.deleteMany({ where: { listingId } });
      await prisma.guideBooking.deleteMany({ where: { listingId } });
      await prisma.guideListing.deleteMany({ where: { id: listingId } });
      await prisma.partner.deleteMany({ where: { id: partnerId } });
      await prisma.user.deleteMany({
        where: { id: { in: [customerId, guideUserId, guestId] } },
      });
    }
    await prisma.$disconnect();
  });

  async function createStaleTaxiOrder() {
    const order = await prisma.taxiOrder.create({
      data: {
        customerId,
        pickupAddress: "A",
        dropoffAddress: "B",
        pickupLat: 41.3,
        pickupLng: 69.2,
        dropoffLat: 41.4,
        dropoffLng: 69.3,
        estimatedPrice: 50000,
        priceSnapshot: {},
      },
    });
    await prisma.taxiOrder.update({
      where: { id: order.id },
      data: {
        createdAt: new Date(Date.now() - TAXI_PENDING_TIMEOUT_MS - 60_000),
      },
    });
    return order.id;
  }

  async function createStaleGuideBooking() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 3);

    const booking = await prisma.guideBooking.create({
      data: {
        listingId,
        guideId: guideUserId,
        guestId,
        date,
        startTime: "09:00",
        endTime: "13:00",
        hours: 4,
        groupSize: 2,
        hourlyRate: 150000,
        totalPrice: 600000,
        priceSnapshot: {},
      },
    });
    await prisma.guideBlockedSlot.create({
      data: {
        listingId,
        guideId: guideUserId,
        date,
        startTime: "09:00",
        endTime: "13:00",
        note: `BOOKED:${booking.id}`,
      },
    });
    return booking.id;
  }

  it("cancels a timed-out taxi order and logs it exactly once", async () => {
    if (!ready) return;
    const orderId = await createStaleTaxiOrder();

    expect(await expirePendingTaxiOrders(50)).toBeGreaterThanOrEqual(1);

    const after = await prisma.taxiOrder.findUnique({ where: { id: orderId } });
    expect(after?.status).toBe("CANCELLED");
    expect(after?.cancelledBy).toBe("SYSTEM");

    // Second tick must be a no-op, not a second CANCELLED log line.
    await expirePendingTaxiOrders(50);
    const logs = await prisma.taxiOrderLog.findMany({
      where: { orderId, toStatus: "CANCELLED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("leaves an accepted order alone even if it is older than the timeout", async () => {
    if (!ready) return;
    const orderId = await createStaleTaxiOrder();
    await prisma.taxiOrder.update({
      where: { id: orderId },
      data: { status: "ACCEPTED", driverId: guideUserId },
    });

    await expirePendingTaxiOrders(50);

    const after = await prisma.taxiOrder.findUnique({ where: { id: orderId } });
    expect(after?.status).toBe("ACCEPTED");
  });

  it("cancels a stale PENDING guide booking, frees its slot, logs once", async () => {
    if (!ready) return;
    const bookingId = await createStaleGuideBooking();

    const first = await expireGuideBookings(50);
    expect(first.cancelled).toBeGreaterThanOrEqual(1);

    const after = await prisma.guideBooking.findUnique({ where: { id: bookingId } });
    expect(after?.status).toBe("CANCELLED");
    expect(after?.cancelledBy).toBe("SYSTEM");

    const slots = await prisma.guideBlockedSlot.findMany({
      where: { note: `BOOKED:${bookingId}` },
    });
    expect(slots).toHaveLength(0);

    const second = await expireGuideBookings(50);
    expect(second.cancelled).toBe(0);

    const logs = await prisma.guideBookingLog.findMany({
      where: { bookingId, toStatus: "CANCELLED" },
    });
    expect(logs).toHaveLength(1);
  });

  it("the PM2 cron entry point expires both without any partner request", async () => {
    if (!ready) return;
    const orderId = await createStaleTaxiOrder();
    const bookingId = await createStaleGuideBooking();

    execFileSync("npx", ["tsx", "scripts/expire-booking-holds.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "pipe",
      timeout: 120_000,
    });

    const order = await prisma.taxiOrder.findUnique({ where: { id: orderId } });
    const booking = await prisma.guideBooking.findUnique({ where: { id: bookingId } });
    expect(order?.status).toBe("CANCELLED");
    expect(booking?.status).toBe("CANCELLED");
  }, 180_000);
});
