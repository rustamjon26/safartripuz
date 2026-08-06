import { NextResponse } from "next/server";
import { cancelTransaction } from "@/app/api/payme/methods/cancelTransaction";
import { checkPerformTransaction } from "@/app/api/payme/methods/checkPerformTransaction";
import { checkTransaction } from "@/app/api/payme/methods/checkTransaction";
import { createTransaction } from "@/app/api/payme/methods/createTransaction";
import { getStatement } from "@/app/api/payme/methods/getStatement";
import { performTransaction } from "@/app/api/payme/methods/performTransaction";
import {
  getPaymentProvidersConfig,
  getPaymeConfig,
  paymeMerchantKey,
} from "@/lib/payments/providerConfig";
import { getPaymeSecretKey } from "@/app/api/payme/utils/helpers";
import {
  isPaymeErrorResponse,
  PAYME_ERRORS,
  paymeRpcError,
} from "../../domain/errors";
import { validatePaymeAuth } from "../../domain/payme-auth";
import { paymentService } from "../../service/payment.service";
import { handleOrderIdMethod } from "./orderIdHandlers";

export type PaymeAccountMode = "booking_id" | "order_id";

const BOOKING_METHODS = {
  CheckPerformTransaction: checkPerformTransaction,
  CreateTransaction: createTransaction,
  PerformTransaction: performTransaction,
  CancelTransaction: cancelTransaction,
  CheckTransaction: checkTransaction,
  GetStatement: getStatement,
} as const;

type BookingMethodName = keyof typeof BOOKING_METHODS;

function isBookingMethod(method: string): method is BookingMethodName {
  return method in BOOKING_METHODS;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function paymeJson(body: object) {
  return NextResponse.json(body, { status: 200 });
}

async function handleSetFiscalDataBooking(rpcId: number, params: Record<string, unknown>) {
  const paymeId = params.id != null ? String(params.id) : "";
  await paymentService.createIntent({
    provider: "PAYME",
    idempotencyKey: `payme:fiscal:booking:${paymeId || "unknown"}`,
    amountTiyin: 0n,
    metadata: { fiscal: params },
  });
  return {
    jsonrpc: "2.0" as const,
    id: rpcId,
    result: { success: true },
  };
}

/**
 * Unified Payme JSON-RPC HTTP handler.
 * accountMode selects Stack A (booking_id + PaymeTransaction) vs Stack B (order_id + Payment).
 */
export async function paymeHttpHandler(
  req: Request,
  opts: { accountMode: PaymeAccountMode; path: string },
) {
  let rpcId = 0;
  let rawBody = "";

  try {
    if (req.method !== "POST") {
      return paymeJson(paymeRpcError(0, PAYME_ERRORS.NOT_POST));
    }

    rawBody = await req.text();

    // Echo the request id on EVERY error envelope — including auth failures.
    // Sandbox checks that "no Authorization" returns -32504 with the same id
    // the request carried; parsing id only after auth left id:0 and failed the test.
    let body: {
      method?: string;
      params?: Record<string, unknown>;
      id?: number;
    } | null = null;
    try {
      body = JSON.parse(rawBody) as {
        method?: string;
        params?: Record<string, unknown>;
        id?: number;
      };
      if (typeof body.id === "number") rpcId = body.id;
    } catch {
      body = null;
    }

    await paymentService.logInbound({
      provider: "PAYME",
      path: opts.path,
      headers: headersToRecord(req.headers),
      rawBody,
      verified: null,
    });

    // Auth — one check for both stacks; only the key source differs.
    // Must return AUTH_FAILED (-32504), never NOT_POST (-32300).
    let secretKey: string;
    if (opts.accountMode === "booking_id") {
      secretKey = getPaymeSecretKey();
    } else {
      const providers = await getPaymentProvidersConfig();
      const config = getPaymeConfig(providers);
      if (!config.enabled) {
        return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.AUTH_FAILED));
      }
      secretKey = paymeMerchantKey(config);
    }

    const authResult = validatePaymeAuth(
      req.headers.get("authorization"),
      secretKey,
    );
    if (!authResult.ok) {
      return paymeJson(paymeRpcError(rpcId, authResult.error));
    }

    if (!body) {
      return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.PARSE_ERROR));
    }

    const method = body.method;
    const params = body.params ?? {};

    if (!method || typeof method !== "string") {
      return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.INVALID_REQUEST));
    }

    if (opts.accountMode === "order_id") {
      const response = await handleOrderIdMethod(method, rpcId, params, rawBody);
      return paymeJson(response);
    }

    // booking_id stack — existing methods + SetFiscalData
    if (method === "SetFiscalData") {
      const response = await handleSetFiscalDataBooking(rpcId, params);
      return paymeJson(response);
    }

    if (!isBookingMethod(method)) {
      return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND));
    }

    const paymeId = params.id != null ? String(params.id) : "";
    const providerEventId = `payme:booking:${method}:${paymeId || "none"}`;
    if (method === "PerformTransaction" || method === "CancelTransaction") {
      const cached = await paymentService.getCachedResponse<object>("PAYME", providerEventId);
      if (cached) return paymeJson(cached);
    }

    const handler = BOOKING_METHODS[method];
    const response = await handler(rpcId, params as never);

    if (
      (method === "PerformTransaction" || method === "CancelTransaction") &&
      !isPaymeErrorResponse(response)
    ) {
      // Errors stay uncached so Payme's retry re-runs the handler; the handlers
      // are idempotent, so a replayed success is answered from state anyway.
      await paymentService.storeProcessedResponse({
        provider: "PAYME",
        providerEventId,
        rawBody,
        response,
      });
    }

    return paymeJson(response);
  } catch (error) {
    console.error("[Payme] System error:", error);
    return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.INTERNAL));
  }
}
