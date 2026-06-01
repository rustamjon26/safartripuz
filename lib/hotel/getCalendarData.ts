import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CALENDAR_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

export type CalendarQuery = {
  hotelId: string;
  start: Date;
  end: Date;
  roomTypeId?: string;
};

export type CalendarBooking = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_amount: number;
  nights: number;
};

export type CalendarRoom = {
  id: string;
  room_number: string;
  floor: string | null;
  room_type: {
    id: string;
    name: string;
    base_price: number;
  };
  status: string;
  bookings: CalendarBooking[];
};

export type CalendarData = {
  rooms: CalendarRoom[];
  date_range: {
    start: string;
    end: string;
    total_days: number;
  };
};

export class CalendarDataError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CalendarDataError";
  }
}

function parseDateOnly(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new CalendarDataError("start/end YYYY-MM-DD formatida bo'lishi kerak", 400);
  }

  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new CalendarDataError("start/end YYYY-MM-DD formatida bo'lishi kerak", 400);
  }

  return parsed;
}

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inclusiveDayCount(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000) + 1;
}

function calcNights(checkIn: Date, checkOut: Date): number {
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
  return Math.max(1, nights);
}

export function parseCalendarQuery(params: URLSearchParams): CalendarQuery {
  const startRaw = params.get("start");
  const endRaw = params.get("end");
  const roomTypeId = params.get("room_type_id")?.trim() || undefined;

  if (!startRaw || !endRaw) {
    throw new CalendarDataError("start va end parametrlari majburiy", 400);
  }

  const start = parseDateOnly(startRaw);
  const end = parseDateOnly(endRaw);

  if (end.getTime() <= start.getTime()) {
    throw new CalendarDataError("end start dan keyin bo'lishi kerak", 400);
  }

  const totalDays = inclusiveDayCount(start, end);
  if (totalDays > 60) {
    throw new CalendarDataError("Max 60 kunlik oraliq", 400);
  }

  return {
    hotelId: "",
    start,
    end,
    roomTypeId: roomTypeId || undefined,
  };
}

export async function getCalendarData(input: CalendarQuery): Promise<CalendarData> {
  if (input.roomTypeId) {
    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId, hotelId: input.hotelId },
      select: { id: true },
    });
    if (!roomType) {
      throw new CalendarDataError("Xona turi topilmadi", 404);
    }
  }

  const rangeStart = new Date(
    input.start.getFullYear(),
    input.start.getMonth(),
    input.start.getDate(),
  );
  const rangeEndExclusive = new Date(
    input.end.getFullYear(),
    input.end.getMonth(),
    input.end.getDate() + 1,
  );

  const physicalRooms = await prisma.physicalRoom.findMany({
    where: {
      hotelId: input.hotelId,
      isActive: true,
      ...(input.roomTypeId ? { roomTypeId: input.roomTypeId } : {}),
    },
    include: {
      roomType: {
        select: { id: true, name: true, basePrice: true },
      },
      assignments: {
        where: {
          status: "ACTIVE",
          checkInDate: { lt: rangeEndExclusive },
          checkOutDate: { gt: rangeStart },
          booking: {
            hotelId: input.hotelId,
            status: { in: CALENDAR_BOOKING_STATUSES },
          },
        },
        include: {
          booking: {
            select: {
              id: true,
              guestName: true,
              checkInDate: true,
              checkOutDate: true,
              status: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { checkInDate: "asc" },
      },
    },
  });

  physicalRooms.sort((a, b) => {
    const byType = a.roomType.name.localeCompare(b.roomType.name, "uz", { sensitivity: "base" });
    if (byType !== 0) return byType;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: "base" });
  });

  const rooms: CalendarRoom[] = physicalRooms.map((room) => {
    const seenBookingIds = new Set<string>();
    const bookings: CalendarBooking[] = [];

    for (const assignment of room.assignments) {
      if (seenBookingIds.has(assignment.booking.id)) continue;
      seenBookingIds.add(assignment.booking.id);

      const checkIn = assignment.checkInDate;
      const checkOut = assignment.checkOutDate;

      bookings.push({
        id: assignment.booking.id,
        guest_name: assignment.booking.guestName,
        check_in: formatDateOnly(checkIn),
        check_out: formatDateOnly(checkOut),
        status: assignment.booking.status,
        total_amount: Number(assignment.booking.totalAmount),
        nights: calcNights(checkIn, checkOut),
      });
    }

    return {
      id: room.id,
      room_number: room.roomNumber,
      floor: room.floor,
      room_type: {
        id: room.roomType.id,
        name: room.roomType.name,
        base_price: Number(room.roomType.basePrice),
      },
      status: room.status,
      bookings,
    };
  });

  return {
    rooms,
    date_range: {
      start: formatDateOnly(input.start),
      end: formatDateOnly(input.end),
      total_days: inclusiveDayCount(input.start, input.end),
    },
  };
}
