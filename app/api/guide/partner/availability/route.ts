import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../_utils";

type ScheduleItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

type UpdateScheduleInput = {
  schedule?: ScheduleItem[];
};

function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export async function GET() {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const schedule = await prisma.guideAvailability.findMany({
      where: { guideId: actor.id },
      orderBy: { dayOfWeek: "asc" },
    });

    const map = new Map(schedule.map((item) => [item.dayOfWeek, item]));
    const data = Array.from({ length: 7 }).map((_, day) => {
      const existing = map.get(day);
      return (
        existing ?? {
          id: null,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isAvailable: true,
        }
      );
    });

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const body = (await req.json()) as UpdateScheduleInput;
    const schedule = body.schedule;
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return fail(GUIDE_ERRORS.INVALID_SCHEDULE, 400);
    }

    const days = new Set<number>();
    for (const item of schedule) {
      if (
        typeof item.dayOfWeek !== "number" ||
        item.dayOfWeek < 0 ||
        item.dayOfWeek > 6 ||
        days.has(item.dayOfWeek) ||
        !isValidTime(item.startTime) ||
        !isValidTime(item.endTime) ||
        item.startTime >= item.endTime
      ) {
        return fail(GUIDE_ERRORS.INVALID_SCHEDULE, 400);
      }
      days.add(item.dayOfWeek);
    }

    const listing = await prisma.guideListing.findFirst({
      where: { hostId: actor.id, partnerId: actor.partnerId },
      select: { id: true },
    });
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const data = await prisma.$transaction(async (tx) => {
      for (const item of schedule) {
        await tx.guideAvailability.upsert({
          where: {
            guideId_dayOfWeek: {
              guideId: actor.id,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            listingId: listing.id,
            startTime: item.startTime,
            endTime: item.endTime,
            isAvailable: item.isAvailable,
          },
          create: {
            listingId: listing.id,
            guideId: actor.id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            isAvailable: item.isAvailable,
          },
        });
      }

      return tx.guideAvailability.findMany({
        where: { guideId: actor.id },
        orderBy: { dayOfWeek: "asc" },
      });
    });

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
