import { prisma } from "@/lib/prisma";
import { commissionService } from "@/src/modules/commission";
import { postCancelAccountingInTx } from "@/src/modules/booking";
import { MissingPartnerError } from "@/src/modules/ledger";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  normalizePaymeTransactionId,
  paymeTransactionInclude,
  toCancelTransactionResult,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function cancelTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await prisma.paymeTransaction.findUnique({
    where: { paymeId },
    include: paymeTransactionInclude,
  });

  if (!transaction) {
    console.log("[Payme] CancelTransaction not found by paymeId:", paymeId);
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  if (transaction.state === -1 || transaction.state === -2) {
    return paymeRpcSuccess(id, toCancelTransactionResult(transaction));
  }

  const reason = typeof params.reason === "number" ? params.reason : null;
  const cancelTime = BigInt(Date.now());

  if (transaction.state === 1) {
    const updated = await prisma.paymeTransaction.update({
      where: { id: transaction.id },
      data: {
        state: -1,
        reason,
        cancelTime,
      },
    });

    return paymeRpcSuccess(
      id,
      toCancelTransactionResult({
        id: updated.id,
        cancelTime: updated.cancelTime,
        state: -1,
      }),
    );
  }

  if (transaction.state === 2) {
    // Payme returns the money to the customer, so the performed sale must be
    // reversed in the ledger too — otherwise partner payable and platform
    // revenue keep counting a booking that was refunded.
    const hotel = await prisma.hotel.findUnique({
      where: { id: transaction.booking.hotelId },
      select: {
        ownerType: true,
        partner: { select: { userId: true } },
      },
    });
    const payoutOwnerType =
      transaction.booking.payoutOwnerType ?? hotel?.ownerType ?? "PARTNER";
    const partnerUserId = hotel?.partner?.userId ?? null;

    if (payoutOwnerType === "PARTNER" && !partnerUserId) {
      console.error("ALERT payme_legacy_cancel_missing_partner", {
        paymeId,
        bookingId: transaction.bookingId,
      });
      return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
    }

    const grossTiyin = BigInt(transaction.amount);

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const cancelled = await tx.paymeTransaction.update({
          where: { id: transaction.id },
          data: {
            state: -2,
            reason,
            cancelTime,
          },
        });

        await tx.booking.update({
          where: { id: transaction.bookingId },
          data: { status: "CANCELLED" },
        });

        const rates = await commissionService.getRates(tx);
        await postCancelAccountingInTx(tx, {
          bookingType: "HOTEL",
          bookingId: transaction.bookingId,
          partnerUserId,
          refund: {
            refundPercent: 100,
            refundTiyin: grossTiyin,
            retainedTiyin: 0n,
            matchedRuleId: null,
            hoursBeforeCheckIn: 0,
            hoursSinceBooking: 0,
          },
          ratePercent: rates.HOTEL,
          payoutOwnerType,
        });

        return cancelled;
      });

      return paymeRpcSuccess(
        id,
        toCancelTransactionResult({
          id: updated.id,
          cancelTime: updated.cancelTime,
          state: -2,
        }),
      );
    } catch (err) {
      if (err instanceof MissingPartnerError) {
        return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
      }
      throw err;
    }
  }

  return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
}
