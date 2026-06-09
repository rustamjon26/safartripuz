import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  normalizePaymeTransactionId,
  paymeTransactionInclude,
  toCheckTransactionResult,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function checkTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await prisma.paymeTransaction.findUnique({
    where: { paymeId },
    include: paymeTransactionInclude,
  });

  if (!transaction) {
    console.log("[Payme] CheckTransaction not found by paymeId:", paymeId);
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  const current = await autoCancelExpiredTransaction(transaction);

  return paymeRpcSuccess(id, toCheckTransactionResult(current));
}
