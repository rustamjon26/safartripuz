import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class HotelReportsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HotelReportsError";
  }
}

export type ReportsGroupBy = "day" | "week" | "month";

export type ReportsQuery = {
  hotelId: string;
  start: string;
  end: string;
  groupBy: ReportsGroupBy;
};

export type HotelReports = {
  period: {
    start: string;
    end: string;
    group_by: ReportsGroupBy;
  };
  summary: {
    total_revenue: number;
    total_bookings: number;
    total_nights: number;
    avg_daily_rate: number;
    occupancy_rate: number;
    cancelled_bookings: number;
    new_guests: number;
    returning_guests: number;
  };
  revenue_chart: Array<{ date: string; revenue: number; bookings: number }>;
  occupancy_chart: Array<{ date: string; occupied: number; total: number; rate: number }>;
  room_type_breakdown: Array<{
    room_type: string;
    bookings: number;
    revenue: number;
    avg_occupancy: number;
  }>;
  top_guests: Array<{
    guest_id: string;
    name: string;
    visits: number;
    total_spent: number;
  }>;
  bookings_detail: Array<{
    booking_id: string;
    guest_name: string;
    guest_phone: string | null;
    room_number: string | null;
    room_type: string | null;
    check_in: string;
    check_out: string;
    nights: number;
    total_amount: number;
    status: BookingStatus;
    payment_method: string;
  }>;
};

function parseDateOnly(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new HotelReportsError("start/end YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new HotelReportsError("start/end YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  return parsed;
}

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function inclusiveDayCount(start: Date, end: Date): number {
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
}

function calcNights(checkIn: Date, checkOut: Date): number {
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));
}

function startOfIsoWeek(date: Date): Date {
  const d = startOfDay(date);
  const weekday = d.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function groupBucket(date: Date, groupBy: ReportsGroupBy): string {
  if (groupBy === "week") return formatDateOnly(startOfIsoWeek(date));
  if (groupBy === "month") return formatDateOnly(startOfMonth(date));
  return formatDateOnly(date);
}

function iterateDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function iterateBuckets(start: Date, end: Date, groupBy: ReportsGroupBy): string[] {
  if (groupBy === "day") {
    return iterateDays(start, end).map(formatDateOnly);
  }

  const keys = new Set<string>();
  for (const day of iterateDays(start, end)) {
    keys.add(groupBucket(day, groupBy));
  }
  return Array.from(keys).sort();
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isDayOccupied(checkIn: Date, checkOut: Date, day: Date): boolean {
  const d = startOfDay(day);
  return d >= startOfDay(checkIn) && d <= startOfDay(checkOut);
}

async function fetchReportBookings(hotelId: string, rangeStart: Date, rangeEndExclusive: Date) {
  return prisma.hotelBooking.findMany({
    where: {
      hotelId,
      status: { not: "CANCELLED" },
      checkInDate: { gte: rangeStart },
      checkOutDate: { lte: rangeEndExclusive },
    },
    include: {
      roomType: { select: { id: true, name: true } },
      guest: { select: { id: true, fullName: true, phone: true, createdAt: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      roomAssignments: {
        where: { status: "ACTIVE" },
        include: {
          physicalRoom: { select: { roomNumber: true, roomTypeId: true } },
        },
      },
    },
    orderBy: { checkInDate: "desc" },
    take: 1000,
  });
}

export function parseReportsQuery(input: ReportsQuery) {
  const start = parseDateOnly(input.start);
  const end = parseDateOnly(input.end);

  if (end.getTime() < start.getTime()) {
    throw new HotelReportsError("end start dan oldin bo'lishi mumkin emas", 400);
  }

  const totalDays = inclusiveDayCount(start, end);
  if (totalDays > 366) {
    throw new HotelReportsError("Max 366 kunlik oraliq", 400);
  }

  return {
    start,
    end,
    rangeStart: startOfDay(start),
    rangeEndExclusive: addDays(startOfDay(end), 1),
    groupBy: input.groupBy,
  };
}

export async function getHotelReports(input: ReportsQuery): Promise<HotelReports> {
  const { start, end, rangeStart, rangeEndExclusive, groupBy } = parseReportsQuery(input);
  const hotelId = input.hotelId;

  const [bookings, cancelledBookings, totalActiveRooms, physicalRooms, assignments, priorGuestIds] =
    await Promise.all([
      fetchReportBookings(hotelId, rangeStart, rangeEndExclusive),
      prisma.hotelBooking.count({
        where: {
          hotelId,
          status: "CANCELLED",
          checkInDate: { gte: rangeStart },
          checkOutDate: { lte: rangeEndExclusive },
        },
      }),
      prisma.physicalRoom.count({ where: { hotelId, isActive: true } }),
      prisma.physicalRoom.findMany({
        where: { hotelId, isActive: true },
        select: { id: true, roomTypeId: true },
      }),
      prisma.bookingRoomAssignment.findMany({
        where: {
          status: "ACTIVE",
          booking: {
            hotelId,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          checkInDate: { lt: rangeEndExclusive },
          checkOutDate: { gt: rangeStart },
        },
        select: {
          physicalRoomId: true,
          checkInDate: true,
          checkOutDate: true,
          physicalRoom: { select: { roomTypeId: true } },
        },
      }),
      prisma.hotelBooking.findMany({
        where: {
          hotelId,
          status: { not: "CANCELLED" },
          checkInDate: { lt: rangeStart },
          guestId: { not: null },
        },
        select: { guestId: true },
        distinct: ["guestId"],
      }),
    ]);

  const priorGuestIdSet = new Set(
    priorGuestIds.map((row) => row.guestId).filter((id): id is string => !!id),
  );

  const priorPhoneRows = await prisma.hotelBooking.findMany({
    where: {
      hotelId,
      status: { not: "CANCELLED" },
      checkInDate: { lt: rangeStart },
      guestPhone: { not: null },
    },
    select: { guestPhone: true },
    distinct: ["guestPhone"],
  });
  const priorPhoneSet = new Set(priorPhoneRows.map((row) => row.guestPhone!));

  let totalRevenue = 0;
  let totalNights = 0;
  let newGuestBookings = 0;

  const revenueBuckets = new Map<string, { revenue: number; bookings: number }>();
  for (const key of iterateBuckets(start, end, groupBy)) {
    revenueBuckets.set(key, { revenue: 0, bookings: 0 });
  }

  const roomTypeStats = new Map<
    string,
    { room_type: string; bookings: number; revenue: number; roomTypeId: string }
  >();

  const guestAgg = new Map<
    string,
    { guest_id: string; name: string; visits: number; total_spent: number }
  >();

  for (const booking of bookings) {
    const amount = Number(booking.totalAmount);
    const nights = calcNights(booking.checkInDate, booking.checkOutDate);
    totalRevenue += amount;
    totalNights += nights;

    const bucket = groupBucket(booking.checkInDate, groupBy);
    const rev = revenueBuckets.get(bucket) ?? { revenue: 0, bookings: 0 };
    rev.revenue += amount;
    rev.bookings += 1;
    revenueBuckets.set(bucket, rev);

    const typeName = booking.roomType?.name ?? "Noma'lum";
    const typeId = booking.roomType?.id ?? "unknown";
    const typeRow = roomTypeStats.get(typeId) ?? {
      room_type: typeName,
      bookings: 0,
      revenue: 0,
      roomTypeId: typeId,
    };
    typeRow.bookings += 1;
    typeRow.revenue += amount;
    roomTypeStats.set(typeId, typeRow);

    const isNew =
      booking.guestId != null
        ? !priorGuestIdSet.has(booking.guestId)
        : booking.guestPhone
          ? !priorPhoneSet.has(booking.guestPhone)
          : true;
    if (isNew) newGuestBookings += 1;

    const guestKey = booking.guestId ?? `${booking.guestName}|${booking.guestPhone ?? ""}`;
    const guestRow = guestAgg.get(guestKey) ?? {
      guest_id: booking.guestId ?? guestKey,
      name: booking.guest?.fullName ?? booking.guestName,
      visits: 0,
      total_spent: 0,
    };
    guestRow.visits += 1;
    guestRow.total_spent += amount;
    guestAgg.set(guestKey, guestRow);
  }

  const days = iterateDays(start, end);
  const roomsByType = new Map<string, string[]>();
  for (const room of physicalRooms) {
    const list = roomsByType.get(room.roomTypeId) ?? [];
    list.push(room.id);
    roomsByType.set(room.roomTypeId, list);
  }

  const occupancyByType = new Map<string, number[]>();
  const occupancyChart = days.map((day) => {
    const occupiedRoomIds = new Set<string>();
    for (const assignment of assignments) {
      if (isDayOccupied(assignment.checkInDate, assignment.checkOutDate, day)) {
        occupiedRoomIds.add(assignment.physicalRoomId);
      }
    }

    for (const [typeId, roomIds] of roomsByType) {
      const occupiedForType = roomIds.filter((id) => occupiedRoomIds.has(id)).length;
      const typeRate = roomIds.length > 0 ? (occupiedForType / roomIds.length) * 100 : 0;
      const typeRates = occupancyByType.get(typeId) ?? [];
      typeRates.push(typeRate);
      occupancyByType.set(typeId, typeRates);
    }

    const occupied = occupiedRoomIds.size;
    const rate = totalActiveRooms > 0 ? round1((occupied / totalActiveRooms) * 100) : 0;
    return {
      date: formatDateOnly(day),
      occupied,
      total: totalActiveRooms,
      rate,
    };
  });

  const avgOccupancy =
    occupancyChart.length > 0
      ? round1(occupancyChart.reduce((sum, row) => sum + row.rate, 0) / occupancyChart.length)
      : 0;

  const roomTypeBreakdown = Array.from(roomTypeStats.values()).map((row) => {
    const typeRates = occupancyByType.get(row.roomTypeId) ?? [];
    const avgTypeOcc =
      typeRates.length > 0
        ? round1(typeRates.reduce((sum, value) => sum + value, 0) / typeRates.length)
        : 0;
    return {
      room_type: row.room_type,
      bookings: row.bookings,
      revenue: row.revenue,
      avg_occupancy: avgTypeOcc,
    };
  });

  roomTypeBreakdown.sort((a, b) => b.revenue - a.revenue);

  const topGuests = Array.from(guestAgg.values())
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 10);

  const totalBookings = bookings.length;
  const avgDailyRate = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

  return {
    period: {
      start: formatDateOnly(start),
      end: formatDateOnly(end),
      group_by: groupBy,
    },
    summary: {
      total_revenue: totalRevenue,
      total_bookings: totalBookings,
      total_nights: totalNights,
      avg_daily_rate: avgDailyRate,
      occupancy_rate: avgOccupancy,
      cancelled_bookings: cancelledBookings,
      new_guests: newGuestBookings,
      returning_guests: totalBookings - newGuestBookings,
    },
    revenue_chart: iterateBuckets(start, end, groupBy).map((date) => {
      const row = revenueBuckets.get(date) ?? { revenue: 0, bookings: 0 };
      return { date, revenue: row.revenue, bookings: row.bookings };
    }),
    occupancy_chart: occupancyChart,
    room_type_breakdown: roomTypeBreakdown,
    top_guests: topGuests,
    bookings_detail: bookings.map((booking) => {
      const assignment =
        booking.roomAssignments.find((a) => a.status === "ACTIVE") ?? booking.roomAssignments[0];
      return {
        booking_id: booking.id,
        guest_name: booking.guestName,
        guest_phone: booking.guest?.phone ?? booking.guestPhone ?? null,
        room_number: assignment?.physicalRoom.roomNumber ?? null,
        room_type: booking.roomType?.name ?? null,
        check_in: formatDateOnly(booking.checkInDate),
        check_out: formatDateOnly(booking.checkOutDate),
        nights: calcNights(booking.checkInDate, booking.checkOutDate),
        total_amount: Number(booking.totalAmount),
        status: booking.status,
        payment_method: booking.payments[0]?.method ?? "CASH",
      };
    }),
  };
}
