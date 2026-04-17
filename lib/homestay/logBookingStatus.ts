import { prisma } from "@/lib/prisma";

type LogBookingStatusInput = {
  bookingId: string;
  actorId?: string | null;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
};

export async function logBookingStatus(input: LogBookingStatusInput) {
  const log = await prisma.homeStayBookingLog.create({
    data: {
      bookingId: input.bookingId,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      note: input.note ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: "HOMESTAY_BOOKING_STATUS_LOGGED",
      entity: "HomeStayBooking",
      entityId: input.bookingId,
      oldData: { status: input.fromStatus },
      newData: {
        status: input.toStatus,
        actorRole: input.actorRole,
        note: input.note ?? null,
        logId: log.id,
      },
    },
  });

  return log;
}
