import { NextResponse } from "next/server";
import { validatePaymeAuth } from "@/app/api/payme/utils/auth";
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
import { verifyPaymeAuth } from "@/lib/payments/payme";
import { PAYME_ERRORS, paymeRpcError } from "../../domain/errors";
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

    await paymentService.logInbound({
      provider: "PAYME",
      path: opts.path,
      headers: headersToRecord(req.headers),
      rawBody,
      verified: null,
    });

    // Auth
    if (opts.accountMode === "booking_id") {
      const authResult = validatePaymeAuth(req.headers.get("authorization"));
      if (!authResult.ok) {
        return paymeJson(paymeRpcError(rpcId, {
          code: authResult.error.code,
          message: authResult.error.message,
        }));
      }
    } else {
      const providers = await getPaymentProvidersConfig();
      const config = getPaymeConfig(providers);
      const merchantKey = paymeMerchantKey(config);
      if (!config.enabled) {
        return paymeJson(paymeRpcError(0, PAYME_ERRORS.AUTH_FAILED));
      }
      const authHeader = req.headers.get("authorization") ?? "";
      if (!verifyPaymeAuth(authHeader, merchantKey)) {
        return paymeJson(paymeRpcError(0, PAYME_ERRORS.AUTH_FAILED));
      }
    }

    let body: {
      method?: string;
      params?: Record<string, unknown>;
      id?: number;
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return paymeJson(paymeRpcError(rpcId, PAYME_ERRORS.PARSE_ERROR));
    }

    rpcId = typeof body.id === "number" ? body.id : 0;
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

    if (method === "PerformTransaction" || method === "CancelTransaction") {
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
