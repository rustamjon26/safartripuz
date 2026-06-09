import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  bigintToNumber,
  findPaymeTransactionByPaymeId,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function performTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = params.id?.trim();
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await findPaymeTransactionByPaymeId(paymeId);
  if (!transaction) {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  if (transaction.state === 2) {
    return paymeRpcSuccess(id, {
      transaction: transaction.paymeId,
      perform_time: bigintToNumber(transaction.performTime),
      state: 2,
    });
  }

  if (transaction.state === -1 || transaction.state === -2) {
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_CANCELLED);
  }

  const expired = await autoCancelExpiredTransaction(transaction);
  if (expired.state === -1) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (expired.booking.status === "PAID") {
    return paymeRpcSuccess(id, {
      transaction: expired.paymeId,
      perform_time: bigintToNumber(expired.performTime) || Date.now(),
      state: 2,
    });
  }

  const performTime = BigInt(Date.now());

  const updated = await prisma.$transaction(async (tx) => {
    const performed = await tx.paymeTransaction.update({
      where: { id: expired.id },
      data: {
        state: 2,
        performTime,
      },
    });

    await tx.booking.update({
      where: { id: expired.bookingId },
      data: { status: "PAID" },
    });

    return performed;
  });

  return paymeRpcSuccess(id, {
    transaction: updated.paymeId,
    perform_time: Number(performTime),
    state: 2,
  });
}
