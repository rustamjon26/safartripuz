import { PAYME_ERRORS } from "./errors";
import { getPaymeSecretKey } from "./helpers";

export type PaymeAuthResult =
  | { ok: true }
  | { ok: false; error: typeof PAYME_ERRORS.INVALID_AUTHORIZATION | typeof PAYME_ERRORS.AUTH_FAILED };

function maskToken(value: string): string {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 4)}****`;
}

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
    console.log("[Payme] Auth failed: secret key is empty at runtime");
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  const expected = Buffer.from(`Paycom:${secretKey}`).toString("base64");
  const received = match[1].trim();

  if (received !== expected) {
    console.log(
      "[Payme] Auth failed: credential mismatch",
      JSON.stringify({
        secretPreview: maskToken(secretKey),
        secretLength: secretKey.length,
        expectedPreview: maskToken(expected),
        receivedPreview: maskToken(received),
        expectedLength: expected.length,
        receivedLength: received.length,
      }),
    );
    return { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
  }

  return { ok: true };
}
