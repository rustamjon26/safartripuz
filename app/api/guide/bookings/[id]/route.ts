import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { DEFAULT_COMMISSION_RATES } from "@/lib/getCommissionRates";
import {
  canGuestCancelStatus,
  computeGuestCancelRefund,
} from "@/src/modules/booking/domain/guest-cancel";
import { postCancelAccountingInTx } from "@/src/modules/booking";
import { Money } from "@/src/shared/money";
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
      select: {
        id: true,
        status: true,
        date: true,
        startTime: true,
        totalPrice: true,
        createdAt: true,
      },
    });
    if (!existing) return fail(GUIDE_ERRORS.BOOKING_NOT_FOUND, 404);
    if (!canGuestCancelStatus(existing.status)) {
      return fail(GUIDE_ERRORS.CANNOT_CANCEL, 400);
    }

    const checkInAt = new Date(existing.date);
    if (existing.startTime) {
      const [hh, mm] = existing.startTime.split(":").map(Number);
      if (Number.isFinite(hh)) checkInAt.setHours(hh, mm || 0, 0, 0);
    }

    const refund = computeGuestCancelRefund({
      checkInAt,
      bookedAt: existing.createdAt,
      grossPaidTiyin: Money.fromSomNumber(Number(existing.totalPrice)).toTiyin(),
    });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.guideBooking.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledBy: "CUSTOMER",
          cancellationReason: body.cancellationReason ?? "Cancelled by customer",
        },
      });

      await postCancelAccountingInTx(tx, {
        bookingType: "GUIDE",
        bookingId: existing.id,
        partnerUserId: existing.guideId,
        refund,
        ratePercent: DEFAULT_COMMISSION_RATES.GUIDE,
      });

      const linkedBlockedSlot = await tx.guideBlockedSlot.findFirst({
        where: {
          listingId: next.listingId,
          guideId: next.guideId,
          date: next.date,
          startTime: next.startTime,
          endTime: next.endTime,
          note: `BOOKED:${next.id}`,
        },
        select: { id: true },
      });
      if (linkedBlockedSlot) {
        await tx.guideBlockedSlot.delete({ where: { id: linkedBlockedSlot.id } });
      }

      await tx.guideBookingLog.create({
        data: {
          bookingId: next.id,
          actorId: actor.id,
          actorRole: "customer",
          fromStatus: existing.status,
          toStatus: "CANCELLED",
          note: next.cancellationReason ?? null,
        },
      });

      return next;
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
