import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BookingDetailError } from "@/lib/hotel/getBookingDetail";

export type UpdateBookingStatusInput = {
  hotelId: string;
  bookingId: string;
  status: "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "CONFIRMED";
  note?: string;
  actorId: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function assertTransition(
  current: BookingStatus,
  next: UpdateBookingStatusInput["status"],
  checkInDate: Date,
  checkOutDate: Date,
): void {
  const today = startOfDay(new Date());

  if (next === "CONFIRMED") {
    if (current !== "PENDING") {
      throw new BookingDetailError(
        `Status o'zgartirish mumkin emas: ${current} → ${next}`,
        400,
      );
    }
    return;
  }

  if (next === "CANCELLED") {
    if (current === "CHECKED_IN") {
      throw new BookingDetailError("Check-in qilingan bronni bekor qilib bo'lmaydi", 409);
    }
    return;
  }

  if (next === "CHECKED_IN") {
    if (current !== "CONFIRMED" && current !== "PENDING") {
      throw new BookingDetailError(
        `Status o'zgartirish mumkin emas: ${current} → ${next}`,
        400,
      );
    }
    if (startOfDay(checkInDate) > today) {
      throw new BookingDetailError("Check-in faqat kelish sanasi bugun yoki o'tgan kun bo'lganda mumkin", 400);
    }
    return;
  }

  if (next === "CHECKED_OUT") {
    if (current !== "CHECKED_IN") {
      throw new BookingDetailError(
        `Status o'zgartirish mumkin emas: ${current} → ${next}`,
        400,
      );
    }
    if (startOfDay(checkOutDate) > today) {
      throw new BookingDetailError("Check-out faqat ketish sanasi bugun yoki o'tgan kun bo'lganda mumkin", 400);
    }
  }
}

export async function updateBookingStatus(input: UpdateBookingStatusInput) {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: input.bookingId, hotelId: input.hotelId },
  });

  if (!booking) {
    throw new BookingDetailError("Bron topilmadi", 404);
  }

  assertTransition(
    booking.status,
    input.status,
    booking.checkInDate,
    booking.checkOutDate,
  );

  const noteAppend = input.note?.trim();
  const nextNote =
    noteAppend && booking.note
      ? `${booking.note}\n${noteAppend}`
      : noteAppend || booking.note;

  await prisma.$transaction(async (tx) => {
    await tx.hotelBooking.update({
      where: { id: booking.id },
      data: {
        status: input.status,
        ...(noteAppend ? { note: nextNote } : {}),
      },
    });

    const assignments = await tx.bookingRoomAssignment.findMany({
      where: { bookingId: booking.id, status: "ACTIVE" },
      select: { id: true, physicalRoomId: true },
    });
    const roomIds = assignments.map((a) => a.physicalRoomId);

    if (input.status === "CHECKED_IN" && roomIds.length) {
      await tx.physicalRoom.updateMany({
        where: { id: { in: roomIds } },
        data: { status: "OCCUPIED" },
      });
    }

    if (input.status === "CHECKED_OUT" && roomIds.length) {
      await tx.physicalRoom.updateMany({
        where: { id: { in: roomIds } },
        data: { status: "CLEANING" },
      });
    }

    if (input.status === "CANCELLED" && assignments.length) {
      await tx.bookingRoomAssignment.updateMany({
        where: { bookingId: booking.id, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
      if (roomIds.length) {
        await tx.physicalRoom.updateMany({
          where: { id: { in: roomIds } },
          data: { status: "AVAILABLE" },
        });
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "HOTEL_BOOKING_STATUS_UPDATED",
      entity: "HotelBooking",
      entityId: booking.id,
      oldData: { status: booking.status },
      newData: { status: input.status, note: noteAppend ?? null },
    },
  });
}
