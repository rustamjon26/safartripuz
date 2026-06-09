import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  findPaymeTransactionByPaymeId,
  toCheckTransactionResult,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function checkTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = params.id?.trim();
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await findPaymeTransactionByPaymeId(paymeId);
  if (!transaction) {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  const current = await autoCancelExpiredTransaction(transaction);

  return paymeRpcSuccess(id, toCheckTransactionResult(current));
}
