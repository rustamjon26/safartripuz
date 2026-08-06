import {
  buildReceiptDetail,
  getBookingIdFromAccount,
  isValidTiyinAmount,
  type PaymeRpcParams,
} from "@/app/api/payme/utils/helpers";
import { paymeBookingRepository } from "../../../repository/payme-booking.repository";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../../../domain/errors";

export async function checkPerformTransaction(id: number, params: PaymeRpcParams) {
  const bookingId = getBookingIdFromAccount(params.account);
  const booking = bookingId
    ? await paymeBookingRepository.findBookingById(bookingId)
    : null;

  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND, "booking_id");
  }

  // Amount must be a whole tiyin value AND match the booking exactly; Payme
  // treats both failures as the same error code.
  if (!isValidTiyinAmount(params.amount) || params.amount !== booking.amount) {
    console.log(
      "[Payme] CheckPerformTransaction amount rejected:",
      JSON.stringify({
        bookingId,
        paramsAmount: params.amount,
        bookingAmount: booking.amount,
      }),
    );
    return paymeRpcError(id, PAYME_ERRORS.WRONG_AMOUNT, "amount");
  }

  if (booking.status === "PAID") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
  }

  // Payme has no distinct "order cancelled" code; a cancelled booking is
  // reported the same way as a missing one (what the legacy alias did too).
  if (booking.status === "CANCELLED") {
    return paymeRpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND, "booking_id");
  }

  return paymeRpcSuccess(id, {
    allow: true,
    detail: buildReceiptDetail(booking),
  });
}
