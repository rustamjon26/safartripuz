import { prisma } from "@/lib/prisma";
import {
  fail,
  hasActiveListing,
  handleApiError,
  onboardingResponse,
  ok,
  requireHomeStayHost,
} from "../../_utils";
import { logBookingStatus } from "@/lib/homestay/logBookingStatus";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";

type BookingPatchInput = {
  action?: "confirm" | "checkin" | "checkout";
  hostNote?: string;
};

const actionTransition: Record<NonNullable<BookingPatchInput["action"]>, { from: string; to: string }> = {
  confirm: { from: "PENDING", to: "CONFIRMED" },
  checkin: { from: "CONFIRMED", to: "CHECKED_IN" },
  checkout: { from: "CHECKED_IN", to: "CHECKED_OUT" },
};

async function getHostBooking(actorId: string, bookingId: string) {
  return prisma.homeStayBooking.findFirst({
    where: {
      id: bookingId,
      listing: { hostId: actorId },
    },
    include: {
      listing: {
        select: { id: true, title: true, city: true },
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
      review: true,
      logs: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const booking = await getHostBooking(actor.id, id);
    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);
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
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const { id } = await params;
    const body = (await req.json()) as BookingPatchInput;

    if (!body.action || !(body.action in actionTransition)) {
      return fail("Invalid action", 400);
    }

    const booking = await getHostBooking(actor.id, id);
    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);

    const transition = actionTransition[body.action];
    if (booking.status !== transition.from) {
      return fail(
        `Invalid status transition: ${booking.status} -> ${transition.to}`,
        400,
      );
    }

    const updated = await prisma.homeStayBooking.update({
      where: { id: booking.id },
      data: {
        status: transition.to as never,
        hostNote: body.hostNote ?? booking.hostNote,
      },
      include: {
        listing: {
          select: { id: true, title: true, city: true },
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
        review: true,
      },
    });

    await logBookingStatus({
      bookingId: booking.id,
      actorId: actor.id,
      actorRole: "home_stay_partner",
      fromStatus: booking.status,
      toStatus: updated.status,
      note: body.hostNote ?? undefined,
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
