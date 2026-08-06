import { prisma } from "@/lib/prisma";
import { BookingDetailError } from "@/lib/hotel/getBookingDetail";
import {
  bookingService,
  IllegalTransitionError,
  UnpaidConfirmationError,
  type BookingStatus,
} from "@/src/modules/booking";

export type UpdateBookingStatusInput = {
  hotelId: string;
  bookingId: string;
  /** CHECKED_OUT is rejected — use COMPLETED (checkout). */
  status: "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "CONFIRMED" | "NO_SHOW";
  note?: string;
  actorId: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function assertTiming(
  current: BookingStatus,
  next: UpdateBookingStatusInput["status"],
  checkInDate: Date,
  checkOutDate: Date,
): void {
  const today = startOfDay(new Date());

  if (next === "CHECKED_IN") {
    if (startOfDay(checkInDate) > today) {
      throw new BookingDetailError(
        "Check-in faqat kelish sanasi bugun yoki o'tgan kun bo'lganda mumkin",
        400,
      );
    }
  }

  if (next === "COMPLETED" && current === "CHECKED_IN") {
    if (startOfDay(checkOutDate) > today) {
      throw new BookingDetailError(
        "Check-out faqat ketish sanasi bugun yoki o'tgan kun bo'lganda mumkin",
        400,
      );
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

  assertTiming(
    booking.status as BookingStatus,
    input.status,
    booking.checkInDate,
    booking.checkOutDate,
  );

  const noteAppend = input.note?.trim();
  const nextNote =
    noteAppend && booking.note
      ? `${booking.note}\n${noteAppend}`
      : noteAppend || booking.note;

  let nextStatus: string = input.status;
  try {
    if (input.status === "CANCELLED") {
      const { booking: updated } = await bookingService.cancelWithPolicy(
        booking.id,
        {
          actor: "PARTNER",
          reason: "HMS_STATUS_UPDATE",
          metadata: { actorId: input.actorId },
          extra: noteAppend ? { note: nextNote } : undefined,
        },
      );
      nextStatus = updated.status;
    } else {
      await bookingService.transition(
        booking.id,
        input.status,
        {
          actor: "PARTNER",
          reason: "HMS_STATUS_UPDATE",
          metadata: { actorId: input.actorId },
          restoreInventory: false,
          extra: noteAppend ? { note: nextNote } : undefined,
        },
      );
    }
  } catch (err) {
    if (err instanceof UnpaidConfirmationError) {
      throw new BookingDetailError(
        "To'lov qayd etilmagan bronni tasdiqlab bo'lmaydi. Avval to'lovni kiriting.",
        400,
      );
    }
    if (err instanceof IllegalTransitionError) {
      throw new BookingDetailError(
        `Status o'zgartirish mumkin emas: ${err.from} → ${err.to}`,
        400,
      );
    }
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "HOTEL_BOOKING_STATUS_UPDATED",
      entity: "HotelBooking",
      entityId: booking.id,
      oldData: { status: booking.status },
      newData: { status: nextStatus, note: noteAppend ?? null },
    },
  });
}
