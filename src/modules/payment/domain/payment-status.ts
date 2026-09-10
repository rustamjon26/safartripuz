/**
 * Payment status semantics.
 *
 * `SUCCESS` means the money arrived *and* the booking + ledger postings for it
 * are complete. `PENDING_REVIEW` means the money arrived but something downstream
 * did not settle, so the ledger holds less than the captured amount.
 *
 * The distinction matters in two different directions:
 *   - PSP protocols only care that the money was captured, so both count.
 *   - Revenue, invoicing and payout reads must use SUCCESS alone.
 */
export const CAPTURED_PAYMENT_STATUSES = ["SUCCESS", "PENDING_REVIEW"] as const;

/** Money is with us — the PSP transaction is performed, not cancellable. */
export function isPaymentCaptured(status: string | null | undefined): boolean {
  return status === "SUCCESS" || status === "PENDING_REVIEW";
}

/** Fully settled: booking confirmed and ledger posted for the whole amount. */
export function isPaymentSettled(status: string | null | undefined): boolean {
  return status === "SUCCESS";
}

/**
 * Coarse return-page view. Never includes amount or booking fields —
 * those stay off the unauthenticated Click/Payme return_url surface.
 */
export type PaymentReturnOutcome = "captured" | "pending" | "failed" | "not_found";

export function paymentReturnOutcome(
  status: string | null | undefined,
): Exclude<PaymentReturnOutcome, "not_found"> {
  if (isPaymentCaptured(status)) return "captured";
  if (status === "FAILED" || status === "CANCELLED") return "failed";
  return "pending";
}
