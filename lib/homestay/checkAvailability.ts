import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AvailabilityConflict = {
  startDate: Date;
  endDate: Date;
  reason: string;
};

export type AvailabilityCheckResult = {
  available: boolean;
  conflicts: AvailabilityConflict[];
};

/** PENDING rows hold the dates for 15 minutes while the guest pays. */
const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

export class HomeStayDatesTakenError extends Error {
  constructor() {
    super("DATES_UNAVAILABLE");
    this.name = "HomeStayDatesTakenError";
  }
}

/**
 * Re-check the dates with the listing row locked. Callers that only run
 * {@link checkHomeStayAvailability} before their transaction can be raced by a
 * concurrent booking; this is the authoritative guard.
 */
export async function assertHomeStayDatesFreeInTx(
  tx: Prisma.TransactionClient,
  input: { listingId: string; checkIn: Date; checkOut: Date },
): Promise<void> {
  await tx.$queryRawUnsafe(
    `SELECT id FROM HomeStayListing WHERE id = ? FOR UPDATE`,
    input.listingId,
  );

  const conflict = await tx.homeStayBooking.findFirst({
    where: {
      listingId: input.listingId,
      status: { in: [...BLOCKING_BOOKING_STATUSES] },
      checkIn: { lt: input.checkOut },
      checkOut: { gt: input.checkIn },
    },
    select: { id: true },
  });
  if (conflict) throw new HomeStayDatesTakenError();

  const blocked = await tx.homeStayAvailability.findFirst({
    where: {
      listingId: input.listingId,
      startDate: { lt: input.checkOut },
      endDate: { gt: input.checkIn },
    },
    select: { id: true },
  });
  if (blocked) throw new HomeStayDatesTakenError();
}

export async function checkHomeStayAvailability(
  listingId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<AvailabilityCheckResult> {
  const [availabilityBlocks, bookingBlocks] = await Promise.all([
    prisma.homeStayAvailability.findMany({
      where: {
        listingId,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      select: {
        startDate: true,
        endDate: true,
        reason: true,
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.homeStayBooking.findMany({
      where: {
        listingId,
        status: { in: [...BLOCKING_BOOKING_STATUSES] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: {
        checkIn: true,
        checkOut: true,
        status: true,
      },
      orderBy: { checkIn: "asc" },
    }),
  ]);

  const conflicts: AvailabilityConflict[] = [
    ...availabilityBlocks.map((block) => ({
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
    })),
    ...bookingBlocks.map((booking) => ({
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      reason: `BOOKING_${booking.status}`,
    })),
  ];

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}
