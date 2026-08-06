import { prisma } from "@/lib/prisma";

export type GuideExpiryResult = {
  /** PENDING bookings whose tour date passed without the guide confirming. */
  cancelled: number;
  /** CONFIRMED/IN_PROGRESS bookings advanced by wall-clock time. */
  advanced: number;
};

const STALE_PENDING_REASON = "Vaqt o'tib ketdi — guide tomonidan tasdiqlanmadi";

function parseTimeToDate(baseDate: Date, time: string) {
  const [h, m] = time.split(":").map((v) => Number(v));
  const dt = new Date(baseDate);
  dt.setHours(h, m, 0, 0);
  return dt;
}

/**
 * Advance guide bookings that wall-clock time has left behind.
 *
 * Called from the expiry cron (scripts/expire-booking-holds.ts). Every write is
 * a conditional UPDATE guarded on the status it expects to move away from, so a
 * second tick — or a guide confirming/cancelling at the same moment — changes 0
 * rows and skips the log write instead of duplicating it.
 */
export async function expireGuideBookings(limit = 100): Promise<GuideExpiryResult> {
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
    },
    take: limit,
  });

  let cancelled = 0;
  for (const booking of stalePending) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        const changed = await tx.$executeRaw`
          UPDATE GuideBooking
          SET status = 'CANCELLED',
              cancelledBy = 'SYSTEM',
              cancellationReason = ${STALE_PENDING_REASON},
              updatedAt = NOW(3)
          WHERE id = ${booking.id}
            AND status = 'PENDING'
        `;
        if (Number(changed) === 0) return false;

        await tx.guideBlockedSlot.deleteMany({
          where: {
            listingId: booking.listingId,
            guideId: booking.guideId,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            note: `BOOKED:${booking.id}`,
          },
        });

        await tx.guideBookingLog.create({
          data: {
            bookingId: booking.id,
            actorRole: "system",
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            note: STALE_PENDING_REASON,
          },
        });
        return true;
      });
      if (done) cancelled += 1;
    } catch (err) {
      console.error("[expireGuideBookings] cancel failed", booking.id, err);
    }
  }

  const inFlight = await prisma.guideBooking.findMany({
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
    take: limit,
  });

  let advanced = 0;
  for (const booking of inFlight) {
    const startAt = parseTimeToDate(booking.date, booking.startTime);
    const endAt = parseTimeToDate(booking.date, booking.endTime);

    let nextStatus: "IN_PROGRESS" | "COMPLETED" | null = null;
    if (booking.status === "CONFIRMED" && now >= endAt) nextStatus = "COMPLETED";
    else if (booking.status === "CONFIRMED" && now >= startAt) nextStatus = "IN_PROGRESS";
    else if (booking.status === "IN_PROGRESS" && now >= endAt) nextStatus = "COMPLETED";

    if (!nextStatus || nextStatus === booking.status) continue;

    try {
      const done = await prisma.$transaction(async (tx) => {
        const changed = await tx.$executeRaw`
          UPDATE GuideBooking
          SET status = ${nextStatus}, updatedAt = NOW(3)
          WHERE id = ${booking.id}
            AND status = ${booking.status}
        `;
        if (Number(changed) === 0) return false;

        await tx.guideBookingLog.create({
          data: {
            bookingId: booking.id,
            actorRole: "system",
            fromStatus: booking.status,
            toStatus: nextStatus,
            note: "Automatic status transition by system time",
          },
        });
        return true;
      });
      if (done) advanced += 1;
    } catch (err) {
      console.error("[expireGuideBookings] advance failed", booking.id, err);
    }
  }

  return { cancelled, advanced };
}
