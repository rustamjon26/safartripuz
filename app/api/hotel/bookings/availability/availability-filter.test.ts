/**
 * The endpoint asked two different questions about the same thing: the
 * room-type branch counted anything that was not CANCELLED/NO_SHOW, while the
 * hotel-wide branch counted only PENDING/CONFIRMED/CHECKED_IN. Both branches
 * must now agree, and neither may miss a room someone is mid-checkout on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

type Booking = { status: string; roomCount: number };

const data = vi.hoisted(() => ({ bookings: [] as Booking[] }));
const capturedStatusFilters = vi.hoisted(() => [] as unknown[]);

/** Applies the route's own `where.status` the way MySQL would. */
function applyStatusFilter(filter: unknown, rows: Booking[]): Booking[] {
  const f = filter as { notIn?: string[]; in?: string[] } | undefined;
  if (!f) return rows;
  if (f.notIn) return rows.filter((b) => !f.notIn!.includes(b.status));
  if (f.in) return rows.filter((b) => f.in!.includes(b.status));
  return rows;
}

vi.mock("@/lib/authz", () => ({
  requireRole: async () => ({ id: "hm1", role: "hotel_manager" }),
}));

vi.mock("@/lib/hotel", () => ({
  getApprovedHotelContextByUserId: async () => ({
    hotel: { id: "h1", totalRooms: 10 },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    roomType: {
      findFirst: vi.fn(async () => ({ id: "rt1", name: "Standard" })),
    },
    physicalRoom: {
      // Same capacity as hotel.totalRooms so both branches are comparable.
      findMany: vi.fn(async () =>
        Array.from({ length: 10 }, (_, i) => ({ id: `room${i}` })),
      ),
    },
    hotelBooking: {
      findMany: vi.fn(async (args: Prisma.HotelBookingFindManyArgs) => {
        const status = (args.where as { status?: unknown } | undefined)?.status;
        capturedStatusFilters.push(status);
        return applyStatusFilter(status, data.bookings);
      }),
    },
  },
}));

import { ROOM_RELEASED_STATUSES } from "@/src/modules/booking";
import { GET } from "./route";

async function availability(roomTypeId?: string) {
  const url = new URL("https://safartrip.uz/api/hotel/bookings/availability");
  url.searchParams.set("checkInDate", "2031-06-01");
  url.searchParams.set("checkOutDate", "2031-06-03");
  if (roomTypeId) url.searchParams.set("roomTypeId", roomTypeId);

  const res = await GET(new Request(url));
  return (await res.json()) as {
    totalRooms: number;
    usedRooms: number;
    availableRooms: number;
  };
}

beforeEach(() => {
  data.bookings = [];
  capturedStatusFilters.length = 0;
});

describe("both branches use one occupancy rule", () => {
  it("agree on a mixed set of statuses", async () => {
    data.bookings = [
      { status: "PENDING", roomCount: 1 },
      { status: "HELD", roomCount: 1 },
      { status: "PAID", roomCount: 1 },
      { status: "CONFIRMED", roomCount: 1 },
      { status: "CHECKED_IN", roomCount: 1 },
      { status: "CANCELLED", roomCount: 1 },
      { status: "NO_SHOW", roomCount: 1 },
      { status: "EXPIRED", roomCount: 1 },
      { status: "REFUNDED", roomCount: 1 },
    ];

    const byRoomType = await availability("rt1");
    const hotelWide = await availability();

    expect(byRoomType.usedRooms).toBe(hotelWide.usedRooms);
    expect(byRoomType.availableRooms).toBe(hotelWide.availableRooms);
    // PENDING, HELD, PAID, CONFIRMED, CHECKED_IN occupy; the other four do not.
    expect(byRoomType.usedRooms).toBe(5);
  });

  it("send an identical status filter to the database", async () => {
    await availability("rt1");
    await availability();

    expect(capturedStatusFilters).toHaveLength(2);
    expect(capturedStatusFilters[0]).toEqual(capturedStatusFilters[1]);
    expect(capturedStatusFilters[0]).toEqual({
      notIn: [...ROOM_RELEASED_STATUSES],
    });
  });
});

describe("a room in mid-checkout is not free", () => {
  it("counts HELD, which the hotel-wide branch used to miss", async () => {
    data.bookings = [{ status: "HELD", roomCount: 2 }];

    const hotelWide = await availability();

    expect(hotelWide.usedRooms).toBe(2);
    expect(hotelWide.availableRooms).toBe(8);
  });

  it("counts PAID too", async () => {
    data.bookings = [{ status: "PAID", roomCount: 3 }];
    expect((await availability()).usedRooms).toBe(3);
  });
});

describe("released rooms go back on sale", () => {
  it("ignores EXPIRED and REFUNDED, which the room-type branch used to count", async () => {
    data.bookings = [
      { status: "EXPIRED", roomCount: 4 },
      { status: "REFUNDED", roomCount: 2 },
    ];

    const byRoomType = await availability("rt1");

    expect(byRoomType.usedRooms).toBe(0);
    expect(byRoomType.availableRooms).toBe(10);
  });

  it("ignores CANCELLED and NO_SHOW", async () => {
    data.bookings = [
      { status: "CANCELLED", roomCount: 1 },
      { status: "NO_SHOW", roomCount: 1 },
    ];
    expect((await availability()).usedRooms).toBe(0);
  });
});
