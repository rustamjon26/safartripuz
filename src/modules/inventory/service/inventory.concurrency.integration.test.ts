/**
 * Requires TEST_DATABASE_URL (see docker-compose.test.yml / .env.test.example).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyTestDatabaseEnv,
  createTestPrisma,
  seedMinimal,
} from "@/src/test/db";
import { inventoryService, InsufficientInventoryError } from "../index";
import { bookingService } from "../../booking";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("inventory concurrency (MySQL)", () => {
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

  it("N parallel reserves for last room: exactly one succeeds", async () => {
    if (!roomTypeId) return;

    const checkIn = new Date("2030-01-10T00:00:00.000Z");
    const checkOut = new Date("2030-01-11T00:00:00.000Z");

    await prisma.inventory.upsert({
      where: { roomTypeId_date: { roomTypeId, date: checkIn } },
      create: {
        roomTypeId,
        date: checkIn,
        totalRooms: 1,
        availableRooms: 1,
      },
      update: { totalRooms: 1, availableRooms: 1 },
    });

    const N = 8;
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        bookingService.createHeldHotelBooking({
          hotelId,
          roomTypeId,
          guestName: `Guest ${i}`,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomCount: 1,
          totalAmount: 100000,
        }),
      ),
    );

    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok.length).toBe(1);

    const row = await prisma.inventory.findUnique({
      where: { roomTypeId_date: { roomTypeId, date: checkIn } },
    });
    expect(row!.availableRooms).toBe(0);
    expect(row!.availableRooms).toBeGreaterThanOrEqual(0);
  });

  it("multi-night with middle night full fails atomically", async () => {
    if (!roomTypeId) return;

    const d0 = new Date("2030-02-01T00:00:00.000Z");
    const d1 = new Date("2030-02-02T00:00:00.000Z");
    const d2 = new Date("2030-02-03T00:00:00.000Z");
    const d3 = new Date("2030-02-04T00:00:00.000Z");

    for (const [date, avail] of [
      [d0, 1],
      [d1, 0],
      [d2, 1],
    ] as const) {
      await prisma.inventory.upsert({
        where: { roomTypeId_date: { roomTypeId, date } },
        create: { roomTypeId, date, totalRooms: 1, availableRooms: avail },
        update: { availableRooms: avail, totalRooms: 1 },
      });
    }

    await expect(
      inventoryService.withSerializableRetry((tx) =>
        inventoryService.reserveRoomNightsInTx(
          { roomTypeId, checkIn: d0, checkOut: d3, roomCount: 1 },
          tx,
        ),
      ),
    ).rejects.toBeInstanceOf(InsufficientInventoryError);

    const first = await prisma.inventory.findUnique({
      where: { roomTypeId_date: { roomTypeId, date: d0 } },
    });
    expect(first!.availableRooms).toBe(1);
  });
});
