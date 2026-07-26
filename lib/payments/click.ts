/**
 * Compatibility shim — prefer `@/src/modules/payment`.
 */
import {
  verifyClickSignature as verifyPhase,
  type ClickSignFields,
} from "@/src/modules/payment/adapters/click/sign";
import { CLICK_ERRORS } from "@/src/modules/payment/domain/errors";

export { CLICK_ERRORS };
export type { ClickSignFields };

export interface ClickPrepareBody extends ClickSignFields {
  click_paydoc_id?: number;
  error?: number;
  error_note?: string;
  sign_string: string;
  action: number;
}

/** Legacy: phase inferred from action (0=prepare, else complete). */
export function verifyClickSignature(
  body: ClickPrepareBody,
  secretKey: string,
): boolean {
  const phase = Number(body.action) === 0 ? "prepare" : "complete";
  return verifyPhase(body, secretKey, phase);
}

export {
  buildClickSignString,
  timingSafeEqualHex,
} from "@/src/modules/payment/adapters/click/sign";
