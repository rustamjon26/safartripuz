/**
 * Mock / PSP-less payment completion is a dev and demo tool. It lets a caller
 * mark a payment paid without any provider callback, so production must never
 * honour it — not even when someone sets the flag there by mistake.
 */

/**
 * Production detection follows the convention the rest of the app already uses
 * for irreversible decisions: `NODE_ENV`. It is what PM2 sets on the server
 * (`ecosystem.config.js`), what `next build` bakes in, and what the auth cookie
 * `secure` flag and Sentry init key off. There is no separate APP_ENV here.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** The flag is set to true on a production runtime — a deploy mistake. */
export function mockPaymentsMisconfigured(): boolean {
  return isProductionRuntime() && process.env.PAYMENTS_MOCK_ENABLED === "true";
}

export const MOCK_PAYMENTS_IN_PRODUCTION_MESSAGE =
  "PAYMENTS_MOCK_ENABLED=true is set on a production runtime. Mock payments " +
  "let anyone mark a payment paid without a provider callback. Remove the " +
  "variable from the server environment.";

/** Warn once per process rather than on every payment request. */
let warned = false;

export function mockPaymentsEnabled(): boolean {
  if (isProductionRuntime()) {
    if (process.env.PAYMENTS_MOCK_ENABLED === "true" && !warned) {
      warned = true;
      console.error(
        `ALERT payments_mock_enabled_in_production ${MOCK_PAYMENTS_IN_PRODUCTION_MESSAGE}`,
      );
    }
    // Ignored on purpose: no env value can turn mock payments on in production.
    return false;
  }

  const flag = process.env.PAYMENTS_MOCK_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return true;
}

/** Test-only: the warn-once latch is process-wide. */
export function resetMockPaymentsWarningForTests(): void {
  warned = false;
}
