import { prisma } from "@/lib/prisma";
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
  }

  return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
}
