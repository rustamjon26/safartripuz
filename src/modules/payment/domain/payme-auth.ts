import { createHash, timingSafeEqual } from "node:crypto";
import { PAYME_ERRORS } from "./errors";

export type PaymeAuthResult =
  | { ok: true }
  | { ok: false; error: typeof PAYME_ERRORS.AUTH_FAILED };

/** Constant-time credential compare (hash first so lengths never leak). */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

/**
 * The single Payme Basic-auth check, shared by the booking_id and order_id
 * stacks — they differ only in where the secret key comes from.
 *
 * Payme sends `Authorization: Basic base64("Paycom:<key>")`. Per RFC 7235 the
 * auth-scheme token is case-insensitive and its separator is any amount of
 * whitespace, while the base64 credential itself is case-sensitive data — so
 * the scheme is matched loosely and the credential is compared byte for byte.
 */
export function validatePaymeAuth(
  authHeader: string | null | undefined,
  secretKey: string,
): PaymeAuthResult {
  if (!authHeader) {
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  const match = /^Basic\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  if (!secretKey) {
    console.error("[Payme] Auth failed: secret key is empty at runtime");
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  const expected = Buffer.from(`Paycom:${secretKey}`).toString("base64");
  const received = match[1].trim();

  if (!timingSafeStringEqual(received, expected)) {
    // Never log secret previews/lengths — a mismatch count is enough signal.
    console.error("[Payme] Auth failed: credential mismatch");
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  return { ok: true };
}
