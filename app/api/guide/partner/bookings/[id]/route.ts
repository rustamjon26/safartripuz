import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../../_utils";
import type { GuideBookingStatus } from "@prisma/client";

type BookingPatchInput = {
  status?: GuideBookingStatus;
  meetingPoint?: string;
  note?: string;
  cancellationReason?: string;
};

const allowedTransitions: Record<GuideBookingStatus, GuideBookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTE: [],
};

async function getOwnBooking(guideId: string, id: string) {
  return prisma.guideBooking.findFirst({
    where: { id, guideId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          meetingPoint: true,
        },
      },
      guest: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: { id: true, first_name: true, last_name: true, role: true },
          },
        },
      },
      review: true,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const booking = await getOwnBooking(actor.id, id);
    if (!booking) return fail(GUIDE_ERRORS.BOOKING_NOT_FOUND, 404);
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const body = (await req.json()) as BookingPatchInput;

    const booking = await prisma.guideBooking.findFirst({
      where: { id, guideId: actor.id },
      include: {
        listing: { select: { id: true, meetingPoint: true } },
      },
    });
    if (!booking) return fail(GUIDE_ERRORS.BOOKING_NOT_FOUND, 404);

    if (!body.status) {
      if (booking.status !== "CONFIRMED") {
        return fail("status majburiy", 400);
      }
      if (!body.meetingPoint && !body.note) {
        return fail("meetingPoint yoki note yuboring", 400);
      }

      const updated = await prisma.guideBooking.update({
        where: { id: booking.id },
        data: {
          meetingPoint: body.meetingPoint ?? undefined,
          guideNote: body.note ?? undefined,
        },
        include: {
          listing: true,
          guest: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
          review: true,
          logs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return ok(updated);
    }

    if (!allowedTransitions[booking.status].includes(body.status)) {
      return fail(GUIDE_ERRORS.INVALID_STATUS_TRANSITION, 400);
    }

    if (booking.status === "PENDING" && body.status === "CONFIRMED") {
      const finalMeetingPoint = body.meetingPoint ?? booking.meetingPoint ?? booking.listing.meetingPoint;
      if (!finalMeetingPoint) return fail(GUIDE_ERRORS.MEETING_POINT_REQUIRED, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.guideBooking.update({
        where: { id: booking.id },
        data: {
          status: body.status,
          meetingPoint:
            booking.status === "PENDING" && body.status === "CONFIRMED"
              ? body.meetingPoint ?? booking.meetingPoint ?? booking.listing.meetingPoint
              : undefined,
          cancelledBy: body.status === "CANCELLED" ? "GUIDE" : undefined,
          cancellationReason:
            body.status === "CANCELLED"
              ? body.cancellationReason ?? "Guide cancelled"
              : undefined,
          guideNote: body.note ?? undefined,
        },
      });

      await tx.guideBookingLog.create({
        data: {
          bookingId: booking.id,
          actorId: actor.id,
          actorRole: "guide_partner",
          fromStatus: booking.status,
          toStatus: updated.status,
          note: body.note ?? null,
        },
      });

      if (body.status === "COMPLETED") {
        await tx.guideListing.update({
          where: { id: booking.listingId },
          data: { totalBookings: { increment: 1 } },
        });
      }

      return tx.guideBooking.findUnique({
        where: { id: updated.id },
        include: {
          listing: true,
          guest: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
          review: true,
          logs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === GUIDE_ERRORS.INVALID_STATUS_TRANSITION) {
      return fail(GUIDE_ERRORS.INVALID_STATUS_TRANSITION, 400);
    }
    return handleApiError(error);
  }
}
