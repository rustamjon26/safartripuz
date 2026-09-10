import { z } from "zod";
import { CLICK_ERROR_NOTES, CLICK_ERRORS } from "../../domain/errors";
import { clickShopTimestamp, logClickShop } from "./log";

const numOrStr = z.union([z.string(), z.number()]);

/**
 * Click Shop API inbound body. Signature fields stay string|number so MD5
 * concatenates the same representation Click hashed (do not coerce amount
 * through Number before verify — trailing zeros on form-encoded amounts matter).
 */
export const clickShopBodySchema = z.object({
  click_trans_id: numOrStr,
  service_id: numOrStr,
  merchant_trans_id: numOrStr.transform((v) => String(v)),
  amount: numOrStr,
  action: numOrStr,
  sign_time: numOrStr.transform((v) => String(v)),
  sign_string: z.string().min(1),
  error: numOrStr.optional().default(0),
  error_note: z.union([z.string(), z.number()]).optional().default(""),
  click_paydoc_id: numOrStr.optional(),
  merchant_prepare_id: numOrStr.optional(),
});

export type ClickShopBody = z.infer<typeof clickShopBodySchema>;

export function asClickNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function requestErrorBody(): { error: number; error_note: string } {
  return {
    error: CLICK_ERRORS.REQUEST_ERROR,
    error_note: CLICK_ERROR_NOTES.REQUEST_ERROR,
  };
}

export type ParsedClickShopRequest =
  | {
      ok: true;
      body: ClickShopBody;
      rawBody: string;
      headers: Record<string, string>;
    }
  | {
      ok: false;
      errorBody: { error: number; error_note: string };
      headers: Record<string, string>;
    };

function logParseFailure(path: string): void {
  logClickShop({
    ts: clickShopTimestamp(),
    channel: "click-shop",
    phase: "unknown",
    path,
    click_trans_id: null,
    merchant_trans_id: null,
    amount: null,
    action: null,
    inbound_error: null,
    signature_ok: null,
    response_error: CLICK_ERRORS.REQUEST_ERROR,
    response_error_note: CLICK_ERROR_NOTES.REQUEST_ERROR,
  });
}

/**
 * HTTP body → Zod ClickShopBody. Parse failures log [click-shop] and return -8.
 */
export async function parseClickShopHttpBody(
  req: Request,
  path: string,
): Promise<ParsedClickShopRequest> {
  const headers = headersToRecord(req.headers);
  const contentType = req.headers.get("content-type") ?? "";
  try {
    let raw: unknown;
    let rawBody: string;
    if (contentType.includes("application/json")) {
      rawBody = await req.text();
      raw = JSON.parse(rawBody) as unknown;
    } else {
      const form = await req.formData();
      const obj: Record<string, string> = {};
      form.forEach((value, key) => {
        if (typeof value === "string") obj[key] = value;
      });
      raw = obj;
      rawBody = JSON.stringify(obj);
    }
    const parsed = clickShopBodySchema.safeParse(raw);
    if (!parsed.success) {
      logParseFailure(path);
      return { ok: false, errorBody: requestErrorBody(), headers };
    }
    return { ok: true, body: parsed.data, rawBody, headers };
  } catch {
    logParseFailure(path);
    return { ok: false, errorBody: requestErrorBody(), headers };
  }
}
