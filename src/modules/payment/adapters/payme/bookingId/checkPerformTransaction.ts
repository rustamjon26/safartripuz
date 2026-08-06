import {
  autoCancelExpiredTransaction,
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

  // Sandbox "Не существует" / invalid account → -31050..-31099
  if (!booking) {
    return paymeRpcError(id, PAYME_ERRORS.INVALID_ACCOUNT, "booking_id");
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

  // Sandbox "Заблокирован" — already paid / cancelled → -31050..-31099
  if (booking.status === "PAID") {
    return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
  }

  if (booking.status === "CANCELLED") {
    return paymeRpcError(id, PAYME_ERRORS.INVALID_ACCOUNT, "booking_id");
  }

  // Sandbox "Обрабатывается" — another transaction already holds this account.
  // CreateTransaction leaves state=1; Perform leaves state=2. Either blocks a
  // new CheckPerform. Expired state=1 is auto-cancelled first (same as Create).
  const existing = await paymeBookingRepository.findTransactionByBookingId(booking.id);
  if (existing) {
    const current = await autoCancelExpiredTransaction(existing);
    if (current.state === 1 || current.state === 2) {
      return paymeRpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID, "booking_id");
    }
    // state -1/-2: cancelled — account is free again for a new payment.
  }

  return paymeRpcSuccess(id, {
    allow: true,
    detail: buildReceiptDetail(booking),
  });
}
