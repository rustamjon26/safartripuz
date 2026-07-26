/**
 * Expire holds twice → inventory restored exactly once.
 * Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyTestDatabaseEnv,
  createTestPrisma,
  seedMinimal,
} from "@/src/test/db";
import { bookingService } from "../index";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("hold.expiry", () => {
  const prisma = createTestPrisma();
  let roomTypeId = "";
  let hotelId = "";
  let partnerId = "";
  let userId = "";

  beforeAll(async () => {
    applyTestDatabaseEnv();
    try {
      await prisma.inventory.findFirst();
    } catch {
      roomTypeId = "";
      return;
    }
    const seeded = await seedMinimal(prisma);
    userId = seeded.userId;
    partnerId = seeded.partnerId;
    hotelId = seeded.hotelId;
    roomTypeId = seeded.roomTypeId;
  }, 120_000);

  afterAll(async () => {
    if (!roomTypeId) {
      await prisma.$disconnect();
      return;
    }
    await prisma.inventory.deleteMany({ where: { roomTypeId } });
    await prisma.bookingEvent.deleteMany({
      where: { booking: { hotelId } },
    });
    await prisma.hotelBooking.deleteMany({ where: { hotelId } });
    await prisma.physicalRoom.deleteMany({ where: { hotelId } });
    await prisma.roomType.deleteMany({ where: { hotelId } });
    await prisma.hotel.deleteMany({ where: { id: hotelId } });
    await prisma.partner.deleteMany({ where: { id: partnerId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("expire twice restores inventory exactly once", async () => {
    if (!roomTypeId) return;

    const checkIn = new Date("2030-03-01T00:00:00.000Z");
    const checkOut = new Date("2030-03-02T00:00:00.000Z");

    await prisma.inventory.upsert({
      where: { roomTypeId_date: { roomTypeId, date: checkIn } },
      create: { roomTypeId, date: checkIn, totalRooms: 1, availableRooms: 1 },
      update: { availableRooms: 1, totalRooms: 1 },
    });

    const booking = await bookingService.createHeldHotelBooking({
      hotelId,
      roomTypeId,
      guestName: "Expire Me",
      checkInDate: checkIn,
      checkOutDate: checkOut,
      roomCount: 1,
      totalAmount: 50000,
    });

    await prisma.hotelBooking.update({
      where: { id: booking.id },
      data: { holdExpiresAt: new Date(Date.now() - 60_000) },
    });

    const r1 = await bookingService.expireHolds(50);
    const r2 = await bookingService.expireHolds(50);
    expect(r1.hotel).toBeGreaterThanOrEqual(1);
    expect(r2.hotel).toBe(0);

    const row = await prisma.inventory.findUnique({
      where: { roomTypeId_date: { roomTypeId, date: checkIn } },
    });
    expect(row!.availableRooms).toBe(1);

    const events = await prisma.bookingEvent.findMany({
      where: { bookingId: booking.id, reason: "INVENTORY_RESTORED" },
    });
    expect(events).toHaveLength(1);
  });
});
