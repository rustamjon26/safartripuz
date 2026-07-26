import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  normalizePaymeTransactionId,
  paymeTransactionInclude,
  toPerformTransactionResult,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function performTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await prisma.paymeTransaction.findUnique({
    where: { paymeId },
    include: paymeTransactionInclude,
  });

  if (!transaction) {
    console.log("[Payme] PerformTransaction not found by paymeId:", paymeId);
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  if (transaction.state === -1 || transaction.state === -2) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (transaction.state === 2) {
    return paymeRpcSuccess(id, toPerformTransactionResult(transaction));
  }

  if (transaction.state !== 1) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const expired = await autoCancelExpiredTransaction(transaction);
  if (expired.state === -1 || expired.state === -2) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (expired.state === 2) {
    return paymeRpcSuccess(id, toPerformTransactionResult(expired));
  }

  if (expired.state !== 1) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const performTime = BigInt(Date.now());

  const { ledgerService } = await import("@/src/modules/ledger");

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

    // Minimal ledger post (tiyin). Legacy Booking has no HotelBooking SM wiring.
    await ledgerService.record(
      {
        idempotencyKey: `payme:${paymeId}`,
        bookingId: expired.bookingId,
        grossTiyin: BigInt(expired.amount),
        partnerUserId: null,
      },
      tx,
    );

    return performed;
  });

  return paymeRpcSuccess(
    id,
    toPerformTransactionResult({
      id: updated.id,
      performTime: updated.performTime,
      state: 2,
    }),
  );
}
