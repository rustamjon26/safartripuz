import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  createTransactionResponse,
  findBookingById,
  findPaymeTransactionByPaymeId,
  getBookingIdFromAccount,
  isValidTiyinAmount,
  normalizePaymeTransactionId,
  type PaymeRpcParams,
} from "../utils/helpers";

async function createPaymeTransactionRecord(input: {
  paymeId: string;
  paymeTime: number;
  bookingId: string;
  amount: number;
}) {
  return prisma.paymeTransaction.create({
    data: {
      paymeId: input.paymeId,
      paymeTime: BigInt(input.paymeTime),
      bookingId: input.bookingId,
      amount: input.amount,
      state: 1,
    },
  });
}

export async function createTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  const paymeTime = params.time;

  if (!paymeId || typeof paymeTime !== "number" || !Number.isFinite(paymeTime)) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const existingByPaymeId = await findPaymeTransactionByPaymeId(paymeId);
  if (existingByPaymeId) {
    const current = await autoCancelExpiredTransaction(existingByPaymeId);
    if (current.state === 1) {
      return paymeRpcSuccess(id, createTransactionResponse(current));
    }
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const bookingId = getBookingIdFromAccount(params.account);
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND, "booking_id");
  }

  if (!isValidTiyinAmount(params.amount)) {
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  const amount = params.amount;

  if (amount !== booking.amount) {
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  if (booking.status === "PAID") {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (booking.status === "CANCELLED") {
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_CANCELLED);
  }

  const existingBookingTransaction = await prisma.paymeTransaction.findUnique({
    where: { bookingId: booking.id },
  });

  if (existingBookingTransaction) {
    const current = await autoCancelExpiredTransaction({
      ...existingBookingTransaction,
      booking,
    });

    if (current.state === 2) {
      return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
    }

    if (current.state === 1) {
      const transaction = await prisma.$transaction(async (tx) => {
        await tx.paymeTransaction.update({
          where: { id: current.id },
          data: {
            state: -1,
            reason: 4,
            cancelTime: BigInt(Date.now()),
          },
        });

        await tx.paymeTransaction.delete({
          where: { id: current.id },
        });

        return tx.paymeTransaction.create({
          data: {
            paymeId,
            paymeTime: BigInt(paymeTime),
            bookingId: booking.id,
            amount,
            state: 1,
          },
        });
      });

      return paymeRpcSuccess(id, createTransactionResponse(transaction));
    }

    if (current.state === -1 || current.state === -2) {
      const transaction = await prisma.$transaction(async (tx) => {
        await tx.paymeTransaction.delete({
          where: { id: current.id },
        });

        return tx.paymeTransaction.create({
          data: {
            paymeId,
            paymeTime: BigInt(paymeTime),
            bookingId: booking.id,
            amount,
            state: 1,
          },
        });
      });

      return paymeRpcSuccess(id, createTransactionResponse(transaction));
    }

    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const transaction = await createPaymeTransactionRecord({
    paymeId,
    paymeTime,
    bookingId: booking.id,
    amount,
  });

  return paymeRpcSuccess(id, createTransactionResponse(transaction));
}
