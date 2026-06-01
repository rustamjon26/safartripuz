import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type BookingDetail,
  bookingDetailInclude,
  serializeBookingDetail,
} from "@/lib/hotel/getBookingDetail";

export class ListBookingsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ListBookingsError";
  }
}

export type ListBookingsInput = {
  hotelId: string;
  status?: BookingStatus;
  dateFilter?: "today" | "week" | "month";
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  perPage: number;
};

export type ListBookingsResult = {
  bookings: BookingDetail[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function parseDateOnly(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new ListBookingsError("Sana YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new ListBookingsError("Sana YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  return parsed;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const weekday = d.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function buildWhere(input: ListBookingsInput): Prisma.HotelBookingWhereInput {
  const and: Prisma.HotelBookingWhereInput[] = [{ hotelId: input.hotelId }];

  if (input.status) {
    and.push({ status: input.status });
  }

  if (input.search) {
    and.push({
      OR: [
        { guestName: { contains: input.search } },
        { guestPhone: { contains: input.search } },
      ],
    });
  }

  if (input.dateFilter === "today") {
    const dayStart = startOfDay(new Date());
    const dayEnd = addDays(dayStart, 1);
    and.push({
      OR: [
        { checkInDate: { gte: dayStart, lt: dayEnd } },
        { checkOutDate: { gte: dayStart, lt: dayEnd } },
      ],
    });
  } else if (input.dateFilter === "week") {
    const now = new Date();
    and.push({
      createdAt: {
        gte: startOfWeek(now),
        lt: addDays(startOfWeek(now), 7),
      },
    });
  } else if (input.dateFilter === "month") {
    const now = new Date();
    and.push({
      createdAt: {
        gte: startOfMonth(now),
        lt: startOfNextMonth(now),
      },
    });
  } else {
    if (input.startDate && input.endDate) {
      const rangeStart = parseDateOnly(input.startDate);
      const rangeEnd = addDays(parseDateOnly(input.endDate), 1);
      if (rangeEnd.getTime() <= rangeStart.getTime()) {
        throw new ListBookingsError("end_date start_date dan keyin bo'lishi kerak", 400);
      }
      and.push({
        checkInDate: { lt: rangeEnd },
        checkOutDate: { gte: rangeStart },
      });
    } else if (input.startDate) {
      and.push({ checkOutDate: { gte: parseDateOnly(input.startDate) } });
    } else if (input.endDate) {
      and.push({ checkInDate: { lt: addDays(parseDateOnly(input.endDate), 1) } });
    }
  }

  return { AND: and };
}

export async function listHotelBookings(input: ListBookingsInput): Promise<ListBookingsResult> {
  const where = buildWhere(input);
  const skip = (input.page - 1) * input.perPage;

  const [total, rows] = await Promise.all([
    prisma.hotelBooking.count({ where }),
    prisma.hotelBooking.findMany({
      where,
      include: bookingDetailInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: input.perPage,
    }),
  ]);

  const bookingIds = rows.map((row) => row.id);
  const auditLogs =
    bookingIds.length === 0
      ? []
      : await prisma.auditLog.findMany({
          where: { entity: "HotelBooking", entityId: { in: bookingIds } },
          include: { actor: { select: { email: true } } },
          orderBy: { createdAt: "asc" },
        });

  const logsByBooking = new Map<string, typeof auditLogs>();
  for (const log of auditLogs) {
    if (!log.entityId) continue;
    const existing = logsByBooking.get(log.entityId) ?? [];
    existing.push(log);
    logsByBooking.set(log.entityId, existing);
  }

  const bookings = rows.map((row) => serializeBookingDetail(row, logsByBooking.get(row.id) ?? []));

  return {
    bookings,
    pagination: {
      total,
      page: input.page,
      per_page: input.perPage,
      total_pages: total === 0 ? 0 : Math.ceil(total / input.perPage),
    },
  };
}
