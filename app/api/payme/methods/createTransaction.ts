import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  createTransactionResponse,
  findBookingById,
  findPaymeTransactionByPaymeId,
  getBookingIdFromAccount,
  isValidTiyinAmount,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function createTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = params.id?.trim();
  const paymeTime = params.time;

  if (!paymeId || typeof paymeTime !== "number" || !Number.isFinite(paymeTime)) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const existingByPaymeId = await findPaymeTransactionByPaymeId(paymeId);
  if (existingByPaymeId) {
    const expired = await autoCancelExpiredTransaction(existingByPaymeId);
    if (expired.state !== 1) {
      return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
    }

    return paymeRpcSuccess(id, createTransactionResponse(expired));
  }

  const bookingId = getBookingIdFromAccount(params.account);
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND, "booking_id");
  }

  if (!isValidTiyinAmount(params.amount)) {
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  if (params.amount !== booking.amount) {
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  if (booking.status === "PAID") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
  }

  if (booking.status === "CANCELLED") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND, "booking_id");
  }

  const existingBookingTransaction = await prisma.paymeTransaction.findUnique({
    where: { bookingId: booking.id },
  });

  if (existingBookingTransaction) {
    if (existingBookingTransaction.state === 2) {
      return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
    }

    if (existingBookingTransaction.paymeId === paymeId) {
      const expired = await autoCancelExpiredTransaction({
        ...existingBookingTransaction,
        booking,
      });

      if (expired.state !== 1) {
        return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
      }

      return paymeRpcSuccess(id, createTransactionResponse(expired));
    }

    const expired = await autoCancelExpiredTransaction({
      ...existingBookingTransaction,
      booking,
    });

    if (expired.state === 1) {
      return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
    }

    const transaction = await prisma.paymeTransaction.update({
      where: { id: expired.id },
      data: {
        paymeId,
        paymeTime: BigInt(paymeTime),
        amount: params.amount,
        state: 1,
        reason: null,
        performTime: null,
        cancelTime: null,
      },
    });

    return paymeRpcSuccess(id, createTransactionResponse(transaction));
  }

  const transaction = await prisma.paymeTransaction.create({
    data: {
      paymeId,
      paymeTime: BigInt(paymeTime),
      bookingId: booking.id,
      amount: params.amount,
      state: 1,
    },
  });

  return paymeRpcSuccess(id, createTransactionResponse(transaction));
}
