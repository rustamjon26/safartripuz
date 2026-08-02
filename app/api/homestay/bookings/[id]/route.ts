import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { logBookingStatus } from "@/lib/homestay/logBookingStatus";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import {
  bookingService,
  canGuestCancelStatus,
} from "@/src/modules/booking";
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
      latestPayment &&
      (latestPayment.status === "INITIATED" || latestPayment.status === "PENDING")
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
      select: { id: true, status: true },
    });
    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);
    if (!canGuestCancelStatus(booking.status)) {
      return fail("This booking can no longer be cancelled", 400);
    }

    // Funnel: cancelHomestayWithPolicy → postCancelAccountingInTx (same as hotel cancelWithPolicy).
    const { booking: updated, refund } =
      await bookingService.cancelHomestayWithPolicy({
        bookingId: booking.id,
        actorId: actor.id,
        cancellationReason: body.cancellationReason ?? "Cancelled by guest",
      });

    await logBookingStatus({
      bookingId: booking.id,
      actorId: actor.id,
      actorRole: "user",
      fromStatus: booking.status,
      toStatus: updated.status,
      note: updated.cancellationReason ?? undefined,
    });

    return ok({
      ...updated,
      refund: {
        refundPercent: refund.refundPercent,
        refundTiyin: refund.refundTiyin.toString(),
        retainedTiyin: refund.retainedTiyin.toString(),
        matchedRuleId: refund.matchedRuleId,
        hoursBeforeCheckIn: refund.hoursBeforeCheckIn,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
