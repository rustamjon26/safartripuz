import { prisma } from "@/lib/prisma";
import { BookingDetailError } from "@/lib/hotel/getBookingDetail";

export type UpdateBookingGuestInput = {
  hotelId: string;
  bookingId: string;
  actorId: string;
  name: string;
  phone: string;
  note?: string;
  adults: number;
  children: number;
};

function buildFullNote(adults: number, children: number, userNote?: string): string | null {
  const parts: string[] = [];
  if (adults !== 1 || children > 0) {
    parts.push(`Kattalar: ${adults}, Bolalar: ${children}`);
  }
  if (userNote?.trim()) {
    parts.push(userNote.trim());
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

export async function updateBookingGuest(input: UpdateBookingGuestInput) {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: input.bookingId, hotelId: input.hotelId },
    include: {
      guests: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (!booking) {
    throw new BookingDetailError("Bron topilmadi", 404);
  }

  const fullNote = buildFullNote(input.adults, input.children, input.note);
  const guestRow = booking.guests[0];

  await prisma.$transaction(async (tx) => {
    await tx.hotelBooking.update({
      where: { id: booking.id },
      data: {
        guestName: input.name.trim(),
        guestPhone: input.phone.trim(),
        note: fullNote,
      },
    });

    if (guestRow) {
      await tx.bookingGuest.update({
        where: { id: guestRow.id },
        data: { firstName: input.name.trim() },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "HOTEL_BOOKING_GUEST_UPDATED",
      entity: "HotelBooking",
      entityId: booking.id,
      oldData: {
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        note: booking.note,
      },
      newData: {
        guestName: input.name.trim(),
        guestPhone: input.phone.trim(),
        note: fullNote,
      },
    },
  });
}
