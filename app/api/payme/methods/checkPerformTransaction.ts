import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  buildReceiptDetail,
  findBookingById,
  findPaymeTransactionByBookingId,
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

  // Sandbox "Не существует" / invalid account → -31050..-31099
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
  const existing = await findPaymeTransactionByBookingId(booking.id);
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
