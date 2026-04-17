import { prisma } from "@/lib/prisma";
import { logBookingStatus } from "@/lib/homestay/logBookingStatus";

export async function completePastCheckedOutBookings() {
  const now = new Date();
  const candidates = await prisma.homeStayBooking.findMany({
    where: {
      status: "CHECKED_OUT",
      checkOut: { lt: now },
    },
    select: { id: true, status: true },
  });

  for (const booking of candidates) {
    await prisma.homeStayBooking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED" },
    });
    await logBookingStatus({
      bookingId: booking.id,
      actorRole: "system",
      fromStatus: booking.status,
      toStatus: "COMPLETED",
      note: "Auto-completed after checkout date passed",
    });
  }

  return { completed: candidates.length };
}
