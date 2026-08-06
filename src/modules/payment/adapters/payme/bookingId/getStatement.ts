import {
  serializePaymeTransaction,
  type PaymeRpcParams,
} from "@/app/api/payme/utils/helpers";
import { paymeBookingRepository } from "../../../repository/payme-booking.repository";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../../../domain/errors";

export async function getStatement(id: number, params: PaymeRpcParams) {
  const { from, to } = params;

  if (
    typeof from !== "number" ||
    typeof to !== "number" ||
    !Number.isFinite(from) ||
    !Number.isFinite(to)
  ) {
    return paymeRpcError(id, PAYME_ERRORS.INTERNAL);
  }

  if (from > to) {
    return paymeRpcSuccess(id, { transactions: [] });
  }

  const transactions = await paymeBookingRepository.findTransactionsInWindow(
    BigInt(from),
    BigInt(to),
  );

  return paymeRpcSuccess(id, {
    transactions: transactions.map(serializePaymeTransaction),
  });
}
