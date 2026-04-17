import { prisma } from "@/lib/prisma";

function parseTimeToDate(baseDate: Date, time: string) {
  const [h, m] = time.split(":").map((v) => Number(v));
  const dt = new Date(baseDate);
  dt.setHours(h, m, 0, 0);
  return dt;
}

export async function expireGuideBookings() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const stalePending = await prisma.guideBooking.findMany({
    where: {
      status: "PENDING",
      date: { lt: todayStart },
    },
    select: {
      id: true,
      listingId: true,
      guideId: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  if (stalePending.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const booking of stalePending) {
        await tx.guideBooking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancelledBy: "SYSTEM",
            cancellationReason: "Vaqt o'tib ketdi — guide tomonidan tasdiqlanmadi",
          },
        });

        const linkedSlot = await tx.guideBlockedSlot.findFirst({
          where: {
            listingId: booking.listingId,
            guideId: booking.guideId,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            note: `BOOKED:${booking.id}`,
          },
          select: { id: true },
        });
        if (linkedSlot) {
          await tx.guideBlockedSlot.delete({ where: { id: linkedSlot.id } });
        }

        await tx.guideBookingLog.create({
          data: {
            bookingId: booking.id,
            actorRole: "system",
            fromStatus: booking.status,
            toStatus: "CANCELLED",
            note: "Vaqt o'tib ketdi — guide tomonidan tasdiqlanmadi",
          },
        });
      }
    });
  }

  const confirmedOrInProgress = await prisma.guideBooking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      date: { lte: now },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  if (confirmedOrInProgress.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const booking of confirmedOrInProgress) {
        const startAt = parseTimeToDate(booking.date, booking.startTime);
        const endAt = parseTimeToDate(booking.date, booking.endTime);

        let nextStatus: "IN_PROGRESS" | "COMPLETED" | null = null;
        if (booking.status === "CONFIRMED" && now >= endAt) nextStatus = "COMPLETED";
        else if (booking.status === "CONFIRMED" && now >= startAt) nextStatus = "IN_PROGRESS";
        else if (booking.status === "IN_PROGRESS" && now >= endAt) nextStatus = "COMPLETED";

        if (!nextStatus || nextStatus === booking.status) continue;

        await tx.guideBooking.update({
          where: { id: booking.id },
          data: { status: nextStatus },
        });

        await tx.guideBookingLog.create({
          data: {
            bookingId: booking.id,
            actorRole: "system",
            fromStatus: booking.status,
            toStatus: nextStatus,
            note: "Automatic status transition by system time",
          },
        });
      }
    });
  }
}
