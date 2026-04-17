import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";

type CheckGuideSlotInput = {
  guideId: string;
  listingId: string;
  date: Date;
  startTime: string;
  endTime: string;
  groupSize: number;
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map((v) => Number(v));
  return h * 60 + m;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

export async function checkGuideSlot(input: CheckGuideSlotInput) {
  if (toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    return {
      available: false,
      reason: GUIDE_ERRORS.INVALID_TIME_RANGE,
      totalPrice: 0,
      hours: 0,
      listing: null,
    };
  }

  const listing = await prisma.guideListing.findFirst({
    where: { id: input.listingId, hostId: input.guideId, status: "ACTIVE" },
    select: {
      id: true,
      hostId: true,
      pricePerHour: true,
      maxGroupSize: true,
      minHours: true,
      maxHours: true,
    },
  });
  if (!listing) {
    return {
      available: false,
      reason: GUIDE_ERRORS.LISTING_NOT_ACTIVE,
      listing: null,
      hours: 0,
      totalPrice: 0,
    };
  }

  const hours = (toMinutes(input.endTime) - toMinutes(input.startTime)) / 60;

  if (input.groupSize > listing.maxGroupSize) {
    return {
      available: false,
      reason: GUIDE_ERRORS.GROUP_SIZE_EXCEEDED,
      listing,
      hours,
      totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
    };
  }

  if (hours < listing.minHours || hours > listing.maxHours) {
    return {
      available: false,
      reason: GUIDE_ERRORS.MIN_HOURS_NOT_MET,
      listing,
      hours,
      totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
    };
  }

  const dayOfWeek = input.date.getDay();
  const weeklySchedule = await prisma.guideAvailability.findFirst({
    where: {
      guideId: input.guideId,
      dayOfWeek,
    },
    select: { isAvailable: true, startTime: true, endTime: true },
  });

  if (!weeklySchedule || !weeklySchedule.isAvailable) {
    return {
      available: false,
      reason: GUIDE_ERRORS.SLOT_UNAVAILABLE,
      listing,
      hours,
      totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
    };
  }
  if (
    toMinutes(input.startTime) < toMinutes(weeklySchedule.startTime) ||
    toMinutes(input.endTime) > toMinutes(weeklySchedule.endTime)
  ) {
    return {
      available: false,
      reason: GUIDE_ERRORS.SLOT_UNAVAILABLE,
      listing,
      hours,
      totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
    };
  }

  const dayStart = new Date(input.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(input.date);
  dayEnd.setHours(23, 59, 59, 999);

  const blockedSlots = await prisma.guideBlockedSlot.findMany({
    where: {
      listingId: listing.id,
      date: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true, startTime: true, endTime: true, note: true },
  });

  for (const slot of blockedSlots) {
    if (!slot.startTime || !slot.endTime) {
      return {
        available: false,
        reason: GUIDE_ERRORS.SLOT_UNAVAILABLE,
        listing,
        hours,
        totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
      };
    }
    if (overlaps(input.startTime, input.endTime, slot.startTime, slot.endTime)) {
      return {
        available: false,
        reason: GUIDE_ERRORS.SLOT_UNAVAILABLE,
        listing,
        hours,
        totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
      };
    }
  }

  const overlappingBookings = await prisma.guideBooking.findMany({
    where: {
      listingId: listing.id,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
    },
    select: { id: true, startTime: true, endTime: true },
  });
  for (const booking of overlappingBookings) {
    if (overlaps(input.startTime, input.endTime, booking.startTime, booking.endTime)) {
      return {
        available: false,
        reason: GUIDE_ERRORS.SLOT_UNAVAILABLE,
        listing,
        hours,
        totalPrice: Number((hours * Number(listing.pricePerHour)).toFixed(2)),
      };
    }
  }

  const totalPrice = Number((hours * Number(listing.pricePerHour)).toFixed(2));

  return {
    available: true,
    reason: undefined,
    listing,
    hours,
    totalPrice,
  };
}
