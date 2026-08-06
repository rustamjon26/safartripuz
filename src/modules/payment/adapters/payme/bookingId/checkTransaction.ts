import {
  autoCancelExpiredTransaction,
  normalizePaymeTransactionId,
  toCheckTransactionResult,
  type PaymeRpcParams,
} from "@/app/api/payme/utils/helpers";
import { paymeBookingRepository } from "../../../repository/payme-booking.repository";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../../../domain/errors";

export async function checkTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.INTERNAL);
  }

  const transaction = await paymeBookingRepository.findTransactionByPaymeId(paymeId);
  if (!transaction) {
    console.log("[Payme] CheckTransaction not found by paymeId:", paymeId);
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
  }

  const current = await autoCancelExpiredTransaction(transaction);
  return paymeRpcSuccess(id, toCheckTransactionResult(current));
}
