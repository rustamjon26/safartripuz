/**
 * Travel-plan Payme helpers — error codes aligned via payment module.
 */
import { PAYME_ERRORS as CORE } from "@/src/modules/payment/domain/errors";

export interface PaymeRpcRequest {
  method: string;
  params: {
    id?: string;
    time?: number;
    amount?: number;
    account?: { order_id?: string };
    reason?: number;
  };
  id: number;
}

export function verifyPaymeAuth(authHeader: string, merchantKey: string): boolean {
  if (!merchantKey) return false;
  const expected = Buffer.from(`Paycom:${merchantKey}`).toString("base64");
  return authHeader === `Basic ${expected}`;
}

/** Legacy key names used by older callers — codes match harden plan. */
export const PAYME_ERRORS = {
  INSUFFICIENT_PRIVILEGE: CORE.AUTH_FAILED,
  TRANSACTION_NOT_FOUND: CORE.TRANSACTION_NOT_FOUND,
  WRONG_AMOUNT: CORE.WRONG_AMOUNT,
  ORDER_NOT_FOUND: CORE.INVALID_ACCOUNT,
  ORDER_ALREADY_PAID: CORE.ORDER_ALREADY_PAID,
  UNABLE_TO_CANCEL: CORE.UNABLE_TO_CANCEL,
} as const;

export type PaymeErrorKey = keyof typeof PAYME_ERRORS;
