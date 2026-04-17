import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { logBookingStatus } from "@/lib/homestay/logBookingStatus";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import { fail, handleApiError, ok } from "../../host/_utils";

type CancelInput = {
  cancellationReason?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const booking = await prisma.homeStayBooking.findFirst({
      where: { id, guestId: actor.id },
      include: {
        listing: true,
        review: true,
        travelPlan: {
          select: {
            id: true,
            status: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                provider: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);
    const latestPayment = booking.travelPlan?.payments[0] ?? null;
    const pendingPayment =
      latestPayment && (latestPayment.status === "INITIATED" || latestPayment.status === "PENDING")
        ? latestPayment
        : null;
    const paymentUrl = pendingPayment
      ? pendingPayment.provider === "MANUAL"
        ? `/payments/manual/${pendingPayment.id}`
        : pendingPayment.provider === "MOCK"
          ? `/payments/mock/${pendingPayment.id}`
          : `/payments/checkout/${booking.travelPlan?.id}?paymentId=${pendingPayment.id}`
      : null;

    return ok({
      ...booking,
      paymentStatus: latestPayment?.status ?? null,
      paymentUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const body = (await req.json()) as CancelInput;

    const booking = await prisma.homeStayBooking.findFirst({
      where: { id, guestId: actor.id },
      select: {
        id: true,
        listingId: true,
        checkIn: true,
        checkOut: true,
        travelPlanId: true,
        status: true,
        cancellationReason: true,
      },
    });
    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return fail("Only PENDING or CONFIRMED bookings can be cancelled", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.homeStayBooking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancellationReason: body.cancellationReason ?? "Cancelled by guest",
        },
      });

      const linkedAvailability = await tx.homeStayAvailability.findFirst({
        where: {
          OR: [
            { bookingId: booking.id },
            {
              listingId: booking.listingId,
              startDate: booking.checkIn,
              endDate: booking.checkOut,
              reason: "BOOKED",
            },
          ],
        },
        select: { id: true },
      });
      if (linkedAvailability) {
        await tx.homeStayAvailability.delete({ where: { id: linkedAvailability.id } });
      }

      if (booking.travelPlanId) {
        const otherLinkedCount = await tx.homeStayBooking.count({
          where: {
            travelPlanId: booking.travelPlanId,
            id: { not: booking.id },
            status: { not: "CANCELLED" },
          },
        });

        if (otherLinkedCount === 0) {
          await tx.travelPlan.update({
            where: { id: booking.travelPlanId },
            data: { status: "DRAFT" },
          });
        }
      }

      return next;
    });

    await logBookingStatus({
      bookingId: booking.id,
      actorId: actor.id,
      actorRole: "user",
      fromStatus: booking.status,
      toStatus: updated.status,
      note: updated.cancellationReason ?? undefined,
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
