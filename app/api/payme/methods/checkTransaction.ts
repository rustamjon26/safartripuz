import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  bigintToNumber,
  findPaymeTransactionByPaymeId,
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

  return paymeRpcSuccess(id, {
    create_time: bigintToNumber(current.paymeTime),
    perform_time: bigintToNumber(current.performTime),
    cancel_time: bigintToNumber(current.cancelTime),
    transaction: current.paymeId,
    state: current.state,
    reason: current.reason,
  });
}
