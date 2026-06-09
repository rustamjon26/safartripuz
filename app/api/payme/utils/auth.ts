import { PAYME_ERRORS } from "./errors";
import { getPaymeSecretKey } from "./helpers";

export type PaymeAuthResult =
  | { ok: true }
  | { ok: false; error: typeof PAYME_ERRORS.INVALID_AUTHORIZATION | typeof PAYME_ERRORS.AUTH_FAILED };

export function validatePaymeAuth(authHeader: string | null): PaymeAuthResult {
  if (!authHeader) {
    return { ok: false, error: PAYME_ERRORS.INVALID_AUTHORIZATION };
  }

  const match = /^Basic\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    return { ok: false, error: PAYME_ERRORS.INVALID_AUTHORIZATION };
  }

  const secretKey = getPaymeSecretKey();
  if (!secretKey) {
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  const expected = Buffer.from(`Paycom:${secretKey}`).toString("base64");
  if (match[1] !== expected) {
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  return { ok: true };
}
