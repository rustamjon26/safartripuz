/**
 * Thin Sentry helpers — safe no-ops when DSN unset or package unavailable at runtime.
 */
import * as Sentry from "@sentry/nextjs";
import { getRequestId } from "./requestContext";

export function setMoneyPathContext(input: {
  bookingId?: string | null;
  paymentId?: string | null;
  requestId?: string | null;
}): void {
  const requestId = input.requestId ?? getRequestId();
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("request_id", requestId);
    if (input.bookingId) scope.setContext("booking", { id: input.bookingId });
    if (input.paymentId) scope.setContext("payment", { id: input.paymentId });
  });
}

export function captureExceptionSafe(err: unknown, hint?: string): void {
  if (!process.env.SENTRY_DSN) {
    if (hint) console.error(hint, err);
    return;
  }
  Sentry.captureException(err, hint ? { tags: { hint } } : undefined);
}

export { Sentry };
