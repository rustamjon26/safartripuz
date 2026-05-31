import crypto from "crypto";

export interface ClickPrepareBody {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id?: number;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

export function verifyClickSignature(body: ClickPrepareBody, secretKey: string): boolean {
  if (!secretKey) return false;

  const merchantPrepareId = body.merchant_prepare_id ?? "";
  const signString =
    `${body.click_trans_id}${body.service_id}${secretKey}` +
    `${body.merchant_trans_id}${merchantPrepareId}` +
    `${body.amount}${body.action}${body.sign_time}`;

  const hash = crypto.createHash("md5").update(signString).digest("hex");
  return hash === body.sign_string;
}

export const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INCORRECT_PARAMS: -2,
  ACTION_NOT_FOUND: -3,
  TRANSACTION_NOT_FOUND: -4,
  TRANSACTION_CANCELLED: -5,
  TRANSACTION_DUPLICATE: -6,
  TRANSACTION_COMPLETED: -7,
  TRANSACTION_EXPIRED: -8,
} as const;
