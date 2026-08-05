/**
 * A front-desk booking must occupy the calendar nights the receptionist typed,
 * whatever zone the server runs in. On the Asia/Tashkent host (UTC+5) the dates
 * were read as local midnight, so every stay was filed one night early.
 * Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma, seedMinimal } from "@/src/test/db";
import { formatDateOnly } from "@/src/modules/inventory";
import { createQuickBooking } from "./createQuickBooking";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

const CHECK_IN = "2031-06-01";
const CHECK_OUT = "2031-06-02";

describe.skipIf(!hasDb)("createQuickBooking calendar dates", () => {
  const prisma = createTestPrisma();
  const originalTz = process.env.TZ;
  let hotelId = "";
  let roomTypeId = "";
  let partnerId = "";
  let userId = "";
  let roomId = "";

  beforeAll(async () => {
    applyTestDatabaseEnv();
    // The production host runs here; the bug only shows east of Greenwich.
    process.env.TZ = "Asia/Tashkent";

    try {
      await prisma.inventory.findFirst();
    } catch {
      return;
    }

    const seeded = await seedMinimal(prisma);
    userId = seeded.userId;
    partnerId = seeded.partnerId;
    hotelId = seeded.hotelId;
    roomTypeId = seeded.roomTypeId;

    const room = await prisma.physicalRoom.findFirst({
      where: { hotelId },
      select: { id: true },
    });
    roomId = room?.id ?? "";
  }, 120_000);

  afterAll(async () => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;

    if (roomTypeId) {
      await prisma.bookingRoomAssignment.deleteMany({
        where: { booking: { hotelId } },
      });
      await prisma.hotelPayment.deleteMany({ where: { hotelId } });
      await prisma.bookingEvent.deleteMany({
        where: { booking: { hotelId } },
      });
      await prisma.hotelBooking.deleteMany({ where: { hotelId } });
      await prisma.inventory.deleteMany({ where: { roomTypeId } });
      await prisma.physicalRoom.deleteMany({ where: { hotelId } });
      await prisma.roomType.deleteMany({ where: { hotelId } });
      await prisma.hotel.deleteMany({ where: { id: hotelId } });
      await prisma.partner.deleteMany({ where: { id: partnerId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("takes the night the receptionist asked for, not the one before", async () => {
    if (!roomId) return;

    // Sanity: the runtime really is east of Greenwich for this test.
    expect(new Date(2031, 5, 1).getTimezoneOffset()).not.toBe(0);

    const booking = await createQuickBooking({
      hotelId,
      roomId,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      guestName: "Timezone Guest",
      guestPhone: "+998900000123",
      adults: 1,
      children: 0,
      paymentMethod: "CASH",
      status: "CONFIRMED",
    });

    // Stored on the booking as the calendar date itself.
    const stored = await prisma.hotelBooking.findUnique({
      where: { id: booking.id },
      select: { checkInDate: true, checkOutDate: true },
    });
    expect(formatDateOnly(stored!.checkInDate)).toBe(CHECK_IN);
    expect(formatDateOnly(stored!.checkOutDate)).toBe(CHECK_OUT);

    const rows = await prisma.inventory.findMany({
      where: { roomTypeId },
      orderBy: { date: "asc" },
      select: { date: true, totalRooms: true, availableRooms: true },
    });

    const booked = rows.find((r) => formatDateOnly(r.date) === CHECK_IN);
    expect(booked).toBeDefined();
    expect(booked!.availableRooms).toBe(booked!.totalRooms - 1);

    // The night before must be untouched — that is where the shift used to land.
    const dayBefore = rows.find((r) => formatDateOnly(r.date) === "2031-05-31");
    expect(dayBefore).toBeUndefined();
  });
});
