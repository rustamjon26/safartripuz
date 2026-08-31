import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  bookingService,
  RoomAlreadyAssignedError,
} from "@/src/modules/booking";
import {
  InsufficientInventoryError,
  parseDateOnlyUtc,
} from "@/src/modules/inventory";
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

/**
 * Calendar dates are read as UTC midnight, the convention inventory keys its
 * nights on. Reading them in the server's zone shifted every stay by a day on
 * the Asia/Tashkent host.
 */
function parseDateOnly(raw: string): Date {
  const parsed = parseDateOnlyUtc(raw);
  if (!parsed) {
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
      assignPhysicalRoomId: input.roomId,
    });
  } catch (err) {
    if (
      err instanceof InsufficientInventoryError ||
      err instanceof RoomAlreadyAssignedError
    ) {
      throw new QuickBookingError("Tanlangan sanalarda xona band", 409);
    }
    throw err;
  }

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
