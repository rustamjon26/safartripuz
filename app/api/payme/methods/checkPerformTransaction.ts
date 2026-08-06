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
  console.log("[CheckPerform] Looking for booking_id:", bookingId);

  const booking = await findBookingById(bookingId);
  console.log(
    "[CheckPerform] Found booking:",
    booking ? { id: booking.id, amount: booking.amount, status: booking.status } : null,
  );

  // Sandbox: invalid/unknown account must be -31050..-31099, not -31001/-31003.
  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.INVALID_ACCOUNT, "booking_id");
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
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_CANCELLED, "booking_id");
  }

  return paymeRpcSuccess(id, {
    allow: true,
    detail: buildReceiptDetail(booking),
  });
}
