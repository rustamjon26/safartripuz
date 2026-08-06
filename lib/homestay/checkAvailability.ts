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

/**
 * A booking occupies its dates while it is confirmed, staying, or holding.
 *
 * PENDING is the 15-minute payment hold: it must block, otherwise a second
 * guest can book the same nights while the first is at the payment page. It
 * stops blocking the moment the hold lapses, mirroring hotel inventory, where
 * `holdExpiresAt < now` already means expired regardless of when the sweep
 * gets around to it. A null deadline is a legacy row with no TTL, so it keeps
 * blocking.
 */
export function occupiedBookingFilter(
  now: Date = new Date(),
): Prisma.HomeStayBookingWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      {
        status: "PENDING",
        OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
      },
    ],
  };
}

/**
 * Availability rows written alongside a booking (`reason: BOOKED`) are freed by
 * the same hold expiry, so they follow the booking rather than block on their
 * own. Manual blocks have no booking and always apply.
 */
function occupiedAvailabilityFilter(
  now: Date = new Date(),
): Prisma.HomeStayAvailabilityWhereInput {
  return {
    OR: [{ bookingId: null }, { booking: occupiedBookingFilter(now) }],
  };
}

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

  const now = new Date();

  const conflict = await tx.homeStayBooking.findFirst({
    where: {
      listingId: input.listingId,
      checkIn: { lt: input.checkOut },
      checkOut: { gt: input.checkIn },
      ...occupiedBookingFilter(now),
    },
    select: { id: true },
  });
  if (conflict) throw new HomeStayDatesTakenError();

  const blocked = await tx.homeStayAvailability.findFirst({
    where: {
      listingId: input.listingId,
      startDate: { lt: input.checkOut },
      endDate: { gt: input.checkIn },
      ...occupiedAvailabilityFilter(now),
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
  const now = new Date();

  const [availabilityBlocks, bookingBlocks] = await Promise.all([
    prisma.homeStayAvailability.findMany({
      where: {
        listingId,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
        ...occupiedAvailabilityFilter(now),
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
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        ...occupiedBookingFilter(now),
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
