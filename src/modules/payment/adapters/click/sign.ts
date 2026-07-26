import crypto from "crypto";

export type ClickSignFields = {
  click_trans_id: number | string;
  service_id: number | string;
  merchant_trans_id: string;
  amount: number | string;
  action: number | string;
  sign_time: string;
  merchant_prepare_id?: number | string | null;
};

/**
 * Prepare (action=0): no merchant_prepare_id in the MD5 string.
 * Complete (action=1): merchant_prepare_id is required in the MD5 string.
 */
export function buildClickSignString(
  body: ClickSignFields,
  secretKey: string,
  phase: "prepare" | "complete",
): string {
  const base =
    `${body.click_trans_id}${body.service_id}${secretKey}` +
    `${body.merchant_trans_id}`;

  if (phase === "prepare") {
    return (
      base + `${body.amount}${body.action}${body.sign_time}`
    );
  }

  const prepareId = body.merchant_prepare_id;
  if (prepareId === undefined || prepareId === null || prepareId === "") {
    throw new Error("merchant_prepare_id required for Complete signature");
  }
  return (
    base +
    `${prepareId}${body.amount}${body.action}${body.sign_time}`
  );
}

export function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length === 0 || ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function verifyClickSignature(
  body: ClickSignFields & { sign_string: string },
  secretKey: string,
  phase: "prepare" | "complete",
): boolean {
  if (!secretKey) return false;
  try {
    const expected = md5Hex(buildClickSignString(body, secretKey, phase));
    return timingSafeEqualHex(expected, body.sign_string);
  } catch {
    return false;
  }
}
