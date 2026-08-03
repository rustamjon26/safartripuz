import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingService } from "@/src/modules/booking";
import { InsufficientInventoryError } from "@/src/modules/inventory";
import { ratesService } from "@/src/modules/rates";
import { Money } from "@/src/shared/money";

export class QuickBookingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "QuickBookingError";
  }
}

export type QuickBookingInput = {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestPhone: string;
  adults: number;
  children: number;
  note?: string;
  paymentMethod: string;
  status: BookingStatus;
};

function parseDateOnly(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new QuickBookingError("Sana YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new QuickBookingError("Sana YYYY-MM-DD formatida bo'lishi kerak", 400);
  }
  return parsed;
}

export async function createQuickBooking(input: QuickBookingInput) {
  const checkInDate = parseDateOnly(input.checkIn);
  const checkOutDate = parseDateOnly(input.checkOut);

  if (checkOutDate.getTime() <= checkInDate.getTime()) {
    throw new QuickBookingError("check_out check_in dan keyin bo'lishi kerak", 400);
  }

  const room = await prisma.physicalRoom.findFirst({
    where: { id: input.roomId, hotelId: input.hotelId, isActive: true },
    include: { roomType: true },
  });

  if (!room?.roomType) {
    throw new QuickBookingError("Xona topilmadi", 404);
  }

  if (input.adults > room.roomType.capacityAdults) {
    throw new QuickBookingError(
      `Kattalar soni ${room.roomType.capacityAdults} dan oshmasligi kerak`,
      400,
    );
  }

  if (input.children > room.roomType.capacityChildren) {
    throw new QuickBookingError(
      `Bolalar soni ${room.roomType.capacityChildren} dan oshmasligi kerak`,
      400,
    );
  }

  const conflict = await prisma.bookingRoomAssignment.findFirst({
    where: {
      physicalRoomId: input.roomId,
      status: "ACTIVE",
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
      booking: { status: { notIn: ["CANCELLED", "NO_SHOW", "EXPIRED"] } },
    },
  });

  if (conflict) {
    throw new QuickBookingError("Tanlangan sanalarda xona band", 409);
  }

  const quote = await ratesService.quoteHotel({
    roomTypeId: room.roomTypeId,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    roomCount: 1,
    adults: input.adults,
    children: input.children,
  });
  const totalAmount = quote.totalSom;
  const paidAmount = input.paymentMethod === "CASH" ? totalAmount : 0;

  const noteParts: string[] = [];
  if (input.adults !== 1 || input.children > 0) {
    noteParts.push(`Kattalar: ${input.adults}, Bolalar: ${input.children}`);
  }
  if (input.note?.trim()) {
    noteParts.push(input.note.trim());
  }
  const note = noteParts.length > 0 ? noteParts.join("\n") : null;

  let booking;
  try {
    booking = await bookingService.createConfirmedHotelBooking({
      hotelId: input.hotelId,
      roomTypeId: room.roomTypeId,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      checkInDate,
      checkOutDate,
      roomCount: 1,
      totalAmount,
      paidAmount,
      source: "RECEPTION",
      note,
      pricingSnapshot: quote.snapshot as Prisma.InputJsonValue,
      guests: [{ firstName: input.guestName, lastName: "" }],
    });
  } catch (err) {
    if (err instanceof InsufficientInventoryError) {
      throw new QuickBookingError("Tanlangan sanalarda xona band", 409);
    }
    throw err;
  }

  await prisma.bookingRoomAssignment.create({
    data: {
      bookingId: booking.id,
      physicalRoomId: input.roomId,
      checkInDate,
      checkOutDate,
      status: "ACTIVE",
    },
  });

  await prisma.hotelPayment.create({
    data: {
      bookingId: booking.id,
      hotelId: input.hotelId,
      amount: totalAmount,
      amountTiyin: Money.fromSomNumber(totalAmount).toTiyin(),
      method: input.paymentMethod,
      status: input.paymentMethod === "CASH" ? "COMPLETED" : "PENDING",
    },
  });

  return booking;
}
