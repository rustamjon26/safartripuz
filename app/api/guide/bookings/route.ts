import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { checkGuideSlot } from "@/lib/guide/checkAvailability";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, ok } from "../_utils";

type CreateBookingInput = {
  listingId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  groupSize?: number;
  customerNote?: string;
  travelPlanId?: string;
};

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: { guestId: string; status?: string } = { guestId: actor.id };
    if (status && status !== "ALL") where.status = status;

    const [items, total] = await Promise.all([
      prisma.guideBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              category: true,
              region: true,
              images: true,
              pricePerHour: true,
            },
          },
          review: true,
        },
      }),
      prisma.guideBooking.count({ where }),
    ]);

    return ok({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const body = (await req.json()) as CreateBookingInput;
    if (!body.listingId || !body.date || !body.startTime || !body.endTime || !body.groupSize) {
      return fail("listingId, date, startTime, endTime, groupSize are required", 400);
    }

    const date = new Date(body.date);
    if (Number.isNaN(date.getTime())) return fail("Invalid date", 400);
    if (body.endTime <= body.startTime) return fail(GUIDE_ERRORS.INVALID_TIME_RANGE, 400);

    const listingContext = await prisma.guideListing.findFirst({
      where: { id: body.listingId },
      select: { id: true, hostId: true, title: true, region: true, status: true },
    });
    if (!listingContext) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);

    const availability = await checkGuideSlot({
      guideId: listingContext.hostId,
      listingId: body.listingId,
      date,
      startTime: body.startTime,
      endTime: body.endTime,
      groupSize: body.groupSize,
    });
    if (!availability.listing) return fail(GUIDE_ERRORS.LISTING_NOT_FOUND, 404);
    if (!availability.available) {
      return fail(availability.reason ?? GUIDE_ERRORS.SLOT_UNAVAILABLE, 409);
    }

    const priceSnapshot: Prisma.InputJsonValue = {
      pricePerHour: Number(availability.listing.pricePerHour),
      hours: availability.hours,
      calculatedAt: new Date().toISOString(),
    };

    const created = await prisma.$transaction(async (tx) => {
      let travelPlanId = body.travelPlanId ?? null;
      let shouldIncrementPlanTotal = false;
      if (travelPlanId) {
        const plan = await tx.travelPlan.findFirst({
          where: { id: travelPlanId, userId: actor.id },
          select: { id: true },
        });
        if (!plan) throw new Error("TRAVEL_PLAN_NOT_FOUND");
      } else {
        const existingPendingPlan = await tx.travelPlan.findFirst({
          where: { userId: actor.id, status: "PENDING_PAYMENT" },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        travelPlanId = existingPendingPlan
          ? existingPendingPlan.id
          : (
              await tx.travelPlan.create({
                data: {
                  userId: actor.id,
                  destination: `${listingContext.region ?? "Guide"} - ${listingContext.title}`,
                  startDate: date,
                  endDate: date,
                  pax: body.groupSize as number,
                  status: "PENDING_PAYMENT",
                  totalAmount: availability.totalPrice,
                  note: "Auto-created from Guide booking",
                },
                select: { id: true },
              })
            ).id;
        shouldIncrementPlanTotal = Boolean(existingPendingPlan);
      }

      const booking = await tx.guideBooking.create({
        data: {
          listingId: availability.listing!.id,
          guideId: availability.listing!.hostId,
          guestId: actor.id,
          travelPlanId,
          date,
          startTime: body.startTime!,
          endTime: body.endTime!,
          hours: availability.hours,
          groupSize: body.groupSize!,
          hourlyRate: Number(availability.listing!.pricePerHour),
          totalPrice: availability.totalPrice,
          priceSnapshot,
          status: "PENDING",
          guestNote: body.customerNote ?? null,
        },
      });

      await tx.guideBlockedSlot.create({
        data: {
          listingId: availability.listing!.id,
          guideId: availability.listing!.hostId,
          date,
          startTime: body.startTime!,
          endTime: body.endTime!,
          note: `BOOKED:${booking.id}`,
        },
      });

      await tx.guideBookingLog.create({
        data: {
          bookingId: booking.id,
          actorId: actor.id,
          actorRole: "customer",
          fromStatus: "PENDING",
          toStatus: "PENDING",
          note: "Booking created",
        },
      });

      if (shouldIncrementPlanTotal && travelPlanId) {
        await tx.travelPlan.update({
          where: { id: travelPlanId },
          data: { totalAmount: { increment: availability.totalPrice } },
        });
      }

      return booking;
    });

    return ok(created, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "TRAVEL_PLAN_NOT_FOUND") {
      return fail("Travel plan topilmadi", 404);
    }
    return handleApiError(error);
  }
}
