import { prisma } from "@/lib/prisma";
import type { BookingStatus, RoomOperationalStatus } from "@prisma/client";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN"];

const ROOM_STATUS_KEYS: Record<
  RoomOperationalStatus,
  keyof Omit<RoomStats, "total">
> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
  BLOCKED: "blocked",
};

type RoomStats = {
  total: number;
  available: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  blocked: number;
};

export type HotelDashboardStats = {
  rooms: RoomStats;
  occupancy_rate: number;
  today: {
    check_ins: number;
    check_outs: number;
    new_bookings: number;
  };
  revenue: {
    today: number;
    this_month: number;
    currency: "UZS";
  };
  recent_bookings: Array<{
    id: string;
    guest_name: string;
    room_number: string | null;
    room_type: string | null;
    check_in: string;
    check_out: string;
    status: BookingStatus;
    total_price: number;
  }>;
};

function emptyRoomStats(): RoomStats {
  return {
    total: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
    blocked: 0,
  };
}

export function parseStatsDateParam(raw: string | null): Date {
  if (!raw) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("INVALID_DATE");
  }

  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error("INVALID_DATE");
  }

  return parsed;
}

function dayRange(day: Date) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(day: Date) {
  const start = new Date(day.getFullYear(), day.getMonth(), 1);
  const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  return { start, end };
}

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function roundOccupancy(occupied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((occupied / total) * 1000) / 10;
}

export async function getHotelDashboardStats(
  hotelId: string,
  day: Date,
): Promise<HotelDashboardStats> {
  const { start: dayStart, end: dayEnd } = dayRange(day);
  const { start: monthStart, end: monthEnd } = monthRange(day);

  const [
    roomGroups,
    checkIns,
    checkOuts,
    newBookings,
    revenueToday,
    revenueMonth,
    recentBookings,
  ] = await Promise.all([
    prisma.physicalRoom.groupBy({
      by: ["status"],
      where: { hotelId, isActive: true },
      _count: { _all: true },
    }),
    prisma.hotelBooking.count({
      where: {
        hotelId,
        checkInDate: { gte: dayStart, lt: dayEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    }),
    prisma.hotelBooking.count({
      where: {
        hotelId,
        checkOutDate: { gte: dayStart, lt: dayEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    }),
    prisma.hotelBooking.count({
      where: {
        hotelId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.hotelBooking.aggregate({
      where: {
        hotelId,
        createdAt: { gte: dayStart, lt: dayEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
    }),
    prisma.hotelBooking.aggregate({
      where: {
        hotelId,
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
    }),
    prisma.hotelBooking.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        guestName: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        totalAmount: true,
        roomType: { select: { name: true } },
        roomAssignments: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            physicalRoom: { select: { roomNumber: true } },
          },
        },
      },
    }),
  ]);

  const rooms = emptyRoomStats();
  for (const group of roomGroups) {
    const key = ROOM_STATUS_KEYS[group.status];
    rooms[key] = group._count._all;
    rooms.total += group._count._all;
  }

  return {
    rooms,
    occupancy_rate: roundOccupancy(rooms.occupied, rooms.total),
    today: {
      check_ins: checkIns,
      check_outs: checkOuts,
      new_bookings: newBookings,
    },
    revenue: {
      today: Number(revenueToday._sum.totalAmount ?? 0),
      this_month: Number(revenueMonth._sum.totalAmount ?? 0),
      currency: "UZS",
    },
    recent_bookings: recentBookings.map((booking) => ({
      id: booking.id,
      guest_name: booking.guestName,
      room_number: booking.roomAssignments[0]?.physicalRoom.roomNumber ?? null,
      room_type: booking.roomType?.name ?? null,
      check_in: formatDateOnly(booking.checkInDate),
      check_out: formatDateOnly(booking.checkOutDate),
      status: booking.status,
      total_price: Number(booking.totalAmount),
    })),
  };
}
