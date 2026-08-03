/**
 * Mock/PSP-less payment completion is a dev/demo tool only.
 * In production it is OFF unless PAYMENTS_MOCK_ENABLED="true" is set explicitly.
 */
export function mockPaymentsEnabled(): boolean {
  const flag = process.env.PAYMENTS_MOCK_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
