import { NextResponse } from "next/server";
import { cancelTransaction } from "./methods/cancelTransaction";
import { checkPerformTransaction } from "./methods/checkPerformTransaction";
import { checkTransaction } from "./methods/checkTransaction";
import { createTransaction } from "./methods/createTransaction";
import { getStatement } from "./methods/getStatement";
import { performTransaction } from "./methods/performTransaction";
import { validatePaymeAuth } from "./utils/auth";
import { PAYME_ERRORS, paymeRpcError } from "./utils/errors";
import { getBookingIdFromAccount, type PaymeRpcRequest } from "./utils/helpers";

const PAYME_METHODS = {
  CheckPerformTransaction: checkPerformTransaction,
  CreateTransaction: createTransaction,
  PerformTransaction: performTransaction,
  CancelTransaction: cancelTransaction,
  CheckTransaction: checkTransaction,
  GetStatement: getStatement,
} as const;

type PaymeMethodName = keyof typeof PAYME_METHODS;

type PaymeLogEntry = {
  timestamp: string;
  phase: "request" | "response" | "auth_failed" | "error";
  method?: string;
  bookingId?: string;
  amount?: number;
  rpcId?: number;
  result?: unknown;
  errorCode?: number;
};

function isPaymeMethodName(method: string): method is PaymeMethodName {
  return method in PAYME_METHODS;
}

function paymeJsonResponse(body: object) {
  return NextResponse.json(body, { status: 200 });
}

function logPayme(entry: PaymeLogEntry) {
  console.log("[Payme]", JSON.stringify(entry));
}

function extractErrorCode(response: object): number | undefined {
  if (!("error" in response)) return undefined;
  const error = (response as { error?: { code?: number } }).error;
  return typeof error?.code === "number" ? error.code : undefined;
}

function extractResult(response: object): unknown {
  if (!("result" in response)) return undefined;
  return (response as { result?: unknown }).result;
}

export async function POST(req: Request) {
  let rpcId = 0;
  let methodName: string | undefined;
  let bookingId: string | undefined;
  let amount: number | undefined;

  try {
    const rawBody = await req.text();

    const authResult = validatePaymeAuth(req.headers.get("authorization"));
    if (!authResult.ok) {
      const response = paymeRpcError(rpcId, authResult.error);
      logPayme({
        timestamp: new Date().toISOString(),
        phase: "auth_failed",
        rpcId,
        errorCode: authResult.error.code,
      });
      return paymeJsonResponse(response);
    }

    let body: PaymeRpcRequest;
    try {
      body = JSON.parse(rawBody) as PaymeRpcRequest;
    } catch {
      const response = paymeRpcError(rpcId, PAYME_ERRORS.INVALID_AUTHORIZATION);
      logPayme({
        timestamp: new Date().toISOString(),
        phase: "error",
        rpcId,
        errorCode: PAYME_ERRORS.INVALID_AUTHORIZATION.code,
      });
      return paymeJsonResponse(response);
    }

    rpcId = typeof body.id === "number" ? body.id : 0;
    methodName = body.method;
    bookingId = getBookingIdFromAccount(body.params?.account);
    amount = body.params?.amount;

    logPayme({
      timestamp: new Date().toISOString(),
      phase: "request",
      method: methodName,
      bookingId,
      amount,
      rpcId,
    });

    const { method, params } = body;

    if (!method || typeof method !== "string") {
      const response = paymeRpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND);
      logPayme({
        timestamp: new Date().toISOString(),
        phase: "response",
        method: methodName,
        bookingId,
        amount,
        rpcId,
        errorCode: PAYME_ERRORS.METHOD_NOT_FOUND.code,
      });
      return paymeJsonResponse(response);
    }

    if (!isPaymeMethodName(method)) {
      const response = paymeRpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND);
      logPayme({
        timestamp: new Date().toISOString(),
        phase: "response",
        method,
        bookingId,
        amount,
        rpcId,
        errorCode: PAYME_ERRORS.METHOD_NOT_FOUND.code,
      });
      return paymeJsonResponse(response);
    }

    const handler = PAYME_METHODS[method];
    const response = await handler(rpcId, params ?? {});

    logPayme({
      timestamp: new Date().toISOString(),
      phase: "response",
      method,
      bookingId,
      amount,
      rpcId,
      result: extractResult(response),
      errorCode: extractErrorCode(response),
    });

    return paymeJsonResponse(response);
  } catch (error) {
    console.error("[Payme] System error:", error);
    const response = paymeRpcError(rpcId, PAYME_ERRORS.SYSTEM_ERROR);
    logPayme({
      timestamp: new Date().toISOString(),
      phase: "error",
      method: methodName,
      bookingId,
      amount,
      rpcId,
      errorCode: PAYME_ERRORS.SYSTEM_ERROR.code,
    });
    return paymeJsonResponse(response);
  }
}
