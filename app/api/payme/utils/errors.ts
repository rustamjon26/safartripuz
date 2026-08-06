/**
 * Payme errors — aligned to harden plan; re-exported from payment module.
 * Aliases preserve keys used by existing method handlers.
 */
import {
  PAYME_ERRORS as CORE,
  paymeRpcError,
  paymeRpcSuccess,
  type PaymeErrorDefinition,
  type PaymeLocalizedMessage,
} from "@/src/modules/payment/domain/errors";

export type { PaymeErrorDefinition, PaymeLocalizedMessage };

export const PAYME_ERRORS = {
  ...CORE,
  /** @deprecated use NOT_POST / PARSE_ERROR */
  INVALID_AUTHORIZATION: CORE.PARSE_ERROR,
  /**
   * Missing PaymeTransaction by payme id — -31003.
   * Missing/unknown booking_id or order_id account → use INVALID_ACCOUNT (-31050).
   */
  ORDER_NOT_FOUND: CORE.TRANSACTION_NOT_FOUND,
  TRANSACTION_CANCELLED: CORE.TRANSACTION_NOT_FOUND,
  UNABLE_TO_PERFORM: CORE.BAD_STATE,
  AMOUNT_MISMATCH: CORE.WRONG_AMOUNT,
  SYSTEM_ERROR: CORE.INTERNAL,
  AUTH_FAILED: CORE.AUTH_FAILED,
  ORDER_ALREADY_PAID: CORE.ORDER_ALREADY_PAID,
  METHOD_NOT_FOUND: CORE.METHOD_NOT_FOUND,
} as const;

export type PaymeErrorKey = keyof typeof PAYME_ERRORS;

export { paymeRpcError, paymeRpcSuccess };
