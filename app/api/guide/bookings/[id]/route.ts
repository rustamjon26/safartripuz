import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import {
  bookingService,
  canGuestCancelStatus,
} from "@/src/modules/booking";
import { fail, handleApiError, ok } from "../../_utils";

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

    const booking = await prisma.guideBooking.findFirst({
      where: { id, guestId: actor.id },
      include: {
        listing: true,
        review: true,
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
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
    const actor = await requireUser();
    const { id } = await params;
    const body = (await req.json()) as CancelInput;

    const existing = await prisma.guideBooking.findFirst({
      where: { id, guestId: actor.id },
      select: { id: true, status: true },
    });
    if (!existing) return fail(GUIDE_ERRORS.BOOKING_NOT_FOUND, 404);
    if (!canGuestCancelStatus(existing.status)) {
      return fail(GUIDE_ERRORS.CANNOT_CANCEL, 400);
    }

    // Funnel: cancelGuideWithPolicy → postCancelAccountingInTx (same as hotel cancelWithPolicy).
    const { booking: updated, refund } = await bookingService.cancelGuideWithPolicy({
      bookingId: existing.id,
      actorId: actor.id,
      actorRole: "customer",
      cancelledBy: "CUSTOMER",
      cancellationReason: body.cancellationReason ?? "Cancelled by customer",
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
