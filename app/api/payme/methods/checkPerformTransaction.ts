import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  buildReceiptDetail,
  findBookingById,
  getBookingIdFromAccount,
  isValidTiyinAmount,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function checkPerformTransaction(id: number, params: PaymeRpcParams) {
  const bookingId = getBookingIdFromAccount(params.account);
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND, "booking_id");
  }

  if (!isValidTiyinAmount(params.amount)) {
    console.log(
      "[Payme] CheckPerformTransaction amount invalid:",
      JSON.stringify({ bookingId, paramsAmount: params.amount, bookingAmount: booking.amount }),
    );
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  if (params.amount !== booking.amount) {
    console.log(
      "[Payme] CheckPerformTransaction amount mismatch:",
      JSON.stringify({ bookingId, paramsAmount: params.amount, bookingAmount: booking.amount }),
    );
    return paymeRpcError(id, PAYME_ERRORS.AMOUNT_MISMATCH, "amount");
  }

  if (booking.status === "PAID") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
  }

  if (booking.status === "CANCELLED") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND, "booking_id");
  }

  return paymeRpcSuccess(id, {
    allow: true,
    detail: buildReceiptDetail(booking),
  });
}
