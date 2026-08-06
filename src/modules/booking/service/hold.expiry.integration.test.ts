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

  describe("guide holds", () => {
    let listingId = "";
    let partnerRowId = "";
    let guideUserId = "";
    let guestId = "";

    /**
     * Its own guide user: Partner.userId is unique, so reusing the hotel
     * partner from seedMinimal would collide. No try/catch — a seeding failure
     * must fail the test rather than skip it silently.
     */
    async function seedGuideListing(): Promise<void> {
      const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const guideUser = await prisma.user.create({
        data: {
          first_name: "Hold",
          last_name: "Guide",
          email: `guide_${stamp}@test.local`,
          phone: `+99894${stamp.slice(-7)}`,
          password: "x",
          role: "guide",
        },
      });
      guideUserId = guideUser.id;

      const partner = await prisma.partner.create({
        data: {
          userId: guideUser.id,
          type: "guide",
          status: "approved",
          displayName: "Hold TTL Guide",
        },
      });
      partnerRowId = partner.id;

      const listing = await prisma.guideListing.create({
        data: {
          partnerId: partner.id,
          hostId: guideUser.id,
          title: "Hold TTL tour",
          description: "spec",
          language: "uz",
          category: "CITY_TOUR",
          pricePerDay: 500000,
          pricePerHour: 100000,
          minHours: 1,
          maxHours: 8,
          maxGroupSize: 10,
          status: "ACTIVE",
        },
      });
      listingId = listing.id;

      const guest = await prisma.user.create({
        data: {
          first_name: "Guide",
          last_name: "Guest",
          email: `guest_${stamp}@test.local`,
          phone: `+99891${stamp.slice(-7)}`,
          password: "x",
          role: "user",
        },
      });
      guestId = guest.id;
    }

    /** Creates the booking plus the slot block the booking route writes. */
    async function seedExpiredGuideHold(date: Date) {
      const booking = await prisma.guideBooking.create({
        data: {
          listingId,
          guideId: userId,
          guestId,
          date,
          startTime: "09:00",
          endTime: "12:00",
          hours: 3,
          groupSize: 2,
          hourlyRate: 100000,
          totalPrice: 300000,
          priceSnapshot: {},
          status: "PENDING",
          holdExpiresAt: new Date(Date.now() - 60_000),
        },
      });
      await prisma.guideBlockedSlot.create({
        data: {
          listingId,
          guideId: userId,
          date,
          startTime: "09:00",
          endTime: "12:00",
          note: `BOOKED:${booking.id}`,
        },
      });
      return booking;
    }

    afterAll(async () => {
      if (!listingId) return;
      await prisma.guideBookingLog.deleteMany({
        where: { booking: { listingId } },
      });
      await prisma.guideBooking.deleteMany({ where: { listingId } });
      await prisma.guideBlockedSlot.deleteMany({ where: { listingId } });
      await prisma.guideListing.deleteMany({ where: { id: listingId } });
      await prisma.partner.deleteMany({ where: { id: partnerRowId } });
      await prisma.user.deleteMany({
        where: { id: { in: [guestId, guideUserId] } },
      });
    });

    it("releases the slot when the hold expires, and only once", async () => {
      if (!roomTypeId) return;
      await seedGuideListing();

      // Far in the future: the old date-based sweep would never touch this.
      const tourDate = new Date("2031-07-04T00:00:00.000Z");
      const booking = await seedExpiredGuideHold(tourDate);

      const r1 = await bookingService.expireHolds(50);
      const r2 = await bookingService.expireHolds(50);

      expect(r1.guide).toBeGreaterThanOrEqual(1);
      expect(r2.guide).toBe(0);

      const row = await prisma.guideBooking.findUnique({
        where: { id: booking.id },
      });
      expect(row?.status).toBe("CANCELLED");
      expect(row?.holdExpiresAt).toBeNull();
      expect(row?.cancellationReason).toBe("HOLD_EXPIRED");

      // The slot is free again, so the date can be booked by someone else.
      const slots = await prisma.guideBlockedSlot.findMany({
        where: { note: `BOOKED:${booking.id}` },
      });
      expect(slots).toHaveLength(0);

      const logs = await prisma.guideBookingLog.findMany({
        where: { bookingId: booking.id, note: "HOLD_EXPIRED" },
      });
      expect(logs).toHaveLength(1);
    });

    it("leaves a hold that has not expired alone", async () => {
      if (!listingId) return;

      const tourDate = new Date("2031-08-04T00:00:00.000Z");
      const booking = await prisma.guideBooking.create({
        data: {
          listingId,
          guideId: userId,
          guestId,
          date: tourDate,
          startTime: "14:00",
          endTime: "16:00",
          hours: 2,
          groupSize: 1,
          hourlyRate: 100000,
          totalPrice: 200000,
          priceSnapshot: {},
          status: "PENDING",
          holdExpiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });

      await bookingService.expireHolds(50);

      const row = await prisma.guideBooking.findUnique({
        where: { id: booking.id },
      });
      expect(row?.status).toBe("PENDING");
    });
  });
});
