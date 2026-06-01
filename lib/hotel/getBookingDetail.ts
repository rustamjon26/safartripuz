import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAmenities } from "@/lib/hotel/roomTypeSchema";

export class BookingDetailError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BookingDetailError";
  }
}

export type BookingDetailHistoryItem = {
  action: string;
  timestamp: string;
  by: string;
};

export type BookingDetail = {
  id: string;
  status: BookingStatus;
  guest: {
    name: string;
    phone: string | null;
    adults: number;
    children: number;
    note: string | null;
  };
  room: {
    id: string | null;
    room_number: string | null;
    floor: string | null;
    room_type: {
      name: string;
      base_price: number;
      amenities: string[];
    };
  };
  dates: {
    check_in: string;
    check_out: string;
    nights: number;
    created_at: string;
  };
  payment: {
    total_amount: number;
    paid_amount: number;
    remaining: number;
    method: string;
    status: "PAID" | "PARTIAL" | "UNPAID";
  };
  history: BookingDetailHistoryItem[];
};

export const bookingDetailInclude = {
  roomType: {
    select: { name: true, basePrice: true, amenities: true },
  },
  guests: { select: { isChild: true } },
  payments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  roomAssignments: {
    where: { status: "ACTIVE" as const },
    take: 1,
    include: {
      physicalRoom: {
        include: {
          roomType: {
            select: { name: true, basePrice: true, amenities: true },
          },
        },
      },
    },
  },
} satisfies Prisma.HotelBookingInclude;

type BookingDetailRecord = Prisma.HotelBookingGetPayload<{
  include: typeof bookingDetailInclude;
}>;

type AuditLogRecord = {
  action: string;
  newData: Prisma.JsonValue;
  createdAt: Date;
  actor: { email: string } | null;
};

const GUEST_COUNT_RE = /^Kattalar:\s*(\d+),\s*Bolalar:\s*(\d+)(?:\n|$)/;

function formatDateOnly(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcNights(checkIn: Date, checkOut: Date): number {
  return Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000),
  );
}

function parseGuestMeta(
  note: string | null,
  guestRows: Array<{ isChild: boolean }>,
): { adults: number; children: number; note: string | null } {
  let adults = guestRows.filter((g) => !g.isChild).length || 1;
  let children = guestRows.filter((g) => g.isChild).length;
  let userNote = note;

  if (note) {
    const match = note.match(GUEST_COUNT_RE);
    if (match) {
      adults = Number(match[1]);
      children = Number(match[2]);
      userNote = note.replace(GUEST_COUNT_RE, "").trim() || null;
    }
  }

  return { adults, children, note: userNote };
}

function mapHistoryAction(action: string, newData: unknown): string {
  if (action === "HOTEL_BOOKING_STATUS_UPDATED" && newData && typeof newData === "object") {
    const status = (newData as { status?: unknown }).status;
    if (typeof status === "string") return status;
  }
  if (action.includes("CREATED")) return "CREATED";
  return action;
}

function derivePaymentStatus(total: number, paid: number): "PAID" | "PARTIAL" | "UNPAID" {
  const remaining = total - paid;
  if (remaining <= 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

function buildHistory(
  booking: BookingDetailRecord,
  auditLogs: AuditLogRecord[],
): BookingDetailHistoryItem[] {
  const history: BookingDetailHistoryItem[] = auditLogs.map((log) => ({
    action: mapHistoryAction(log.action, log.newData),
    timestamp: log.createdAt.toISOString(),
    by: log.actor?.email ?? "system",
  }));

  if (!history.some((item) => item.action === "CREATED")) {
    history.unshift({
      action: "CREATED",
      timestamp: booking.createdAt.toISOString(),
      by: "system",
    });
  }

  return history;
}

export function serializeBookingDetail(
  booking: BookingDetailRecord,
  auditLogs: AuditLogRecord[] = [],
): BookingDetail {
  const assignment = booking.roomAssignments[0] ?? null;
  const physicalRoom = assignment?.physicalRoom ?? null;
  const roomType = physicalRoom?.roomType ?? booking.roomType;

  if (!roomType) {
    throw new BookingDetailError("Xona turi topilmadi", 404);
  }

  const guestMeta = parseGuestMeta(booking.note, booking.guests);
  const totalAmount = Number(booking.totalAmount);
  const paidAmount = Number(booking.paidAmount);
  const latestPayment = booking.payments[0];

  return {
    id: booking.id,
    status: booking.status,
    guest: {
      name: booking.guestName,
      phone: booking.guestPhone,
      adults: guestMeta.adults,
      children: guestMeta.children,
      note: guestMeta.note,
    },
    room: {
      id: physicalRoom?.id ?? null,
      room_number: physicalRoom?.roomNumber ?? null,
      floor: physicalRoom?.floor ?? null,
      room_type: {
        name: roomType.name,
        base_price: Number(roomType.basePrice),
        amenities: parseAmenities(roomType.amenities),
      },
    },
    dates: {
      check_in: formatDateOnly(booking.checkInDate),
      check_out: formatDateOnly(booking.checkOutDate),
      nights: calcNights(booking.checkInDate, booking.checkOutDate),
      created_at: booking.createdAt.toISOString(),
    },
    payment: {
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining: Math.max(0, totalAmount - paidAmount),
      method: latestPayment?.method ?? "CASH",
      status: derivePaymentStatus(totalAmount, paidAmount),
    },
    history: buildHistory(booking, auditLogs),
  };
}

export async function getBookingDetail(
  hotelId: string,
  bookingId: string,
): Promise<BookingDetail> {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: bookingId, hotelId },
    include: bookingDetailInclude,
  });

  if (!booking) {
    throw new BookingDetailError("Bron topilmadi", 404);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: "HotelBooking", entityId: bookingId },
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return serializeBookingDetail(booking, auditLogs);
}
