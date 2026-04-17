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
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
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
