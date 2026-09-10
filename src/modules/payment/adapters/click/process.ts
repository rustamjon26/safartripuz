import { Money, MoneyError } from "@/src/shared/money";
import { completeSuccessfulPaymentInTx } from "@/src/modules/booking";
import { getClickConfig, getPaymentProvidersConfig } from "../../domain/provider-config";
import { isPaymentCaptured } from "../../domain/payment-status";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";
import { CLICK_ERROR_NOTES, CLICK_ERRORS } from "../../domain/errors";
import { paymentRepository } from "../../repository/payment.repository";
import { paymentService } from "../../service/payment.service";
import { logClickShop, clickShopTimestamp } from "./log";
import { asClickNumber, type ClickShopBody } from "./schema";
import { verifyClickSignature } from "./sign";

export type ClickShopResult = Record<string, unknown> & {
  error: number;
  error_note: string;
};

function clickFail(
  code: keyof typeof CLICK_ERROR_NOTES,
  extra: Record<string, unknown> = {},
): ClickShopResult {
  return {
    ...extra,
    error: CLICK_ERRORS[code],
    error_note: CLICK_ERROR_NOTES[code],
  };
}

function reply(
  payload: ClickShopResult,
  meta: {
    path: string;
    phase: "prepare" | "complete" | "unknown";
    body: ClickShopBody | null;
    signatureOk: boolean | null;
  },
): ClickShopResult {
  logClickShop({
    ts: clickShopTimestamp(),
    channel: "click-shop",
    phase: meta.phase,
    path: meta.path,
    click_trans_id: meta.body?.click_trans_id ?? null,
    merchant_trans_id: meta.body?.merchant_trans_id ?? null,
    merchant_prepare_id: meta.body?.merchant_prepare_id ?? null,
    amount: meta.body?.amount ?? null,
    action: meta.body?.action ?? null,
    inbound_error: meta.body ? asClickNumber(meta.body.error) : null,
    signature_ok: meta.signatureOk,
    response_error: payload.error,
    response_error_note: payload.error_note,
  });
  return payload;
}

/**
 * Canonical Click Shop Prepare/Complete. Routes must call this — do not
 * reimplement signature/amount/idempotency in a parallel handler.
 */
export async function processClickShop(input: {
  body: ClickShopBody;
  rawBody: string;
  path: string;
  headers?: Record<string, string>;
}): Promise<ClickShopResult> {
  const { body, rawBody, path, headers = {} } = input;
  const action = asClickNumber(body.action);
  const phase: "prepare" | "complete" | "unknown" =
    action === 0 ? "prepare" : action === 1 ? "complete" : "unknown";

  const logMeta = {
    path,
    phase,
    body,
    signatureOk: null as boolean | null,
  };

  await paymentService.logInbound({
    provider: "CLICK",
    path,
    headers,
    rawBody,
    verified: null,
  });

  try {
    return await runClickShop({ body, rawBody, path, headers, action, logMeta });
  } catch (err) {
    console.error("[click-shop] unhandled", err);
    return reply(clickFail("UPDATE_FAILED"), logMeta);
  }
}

async function runClickShop(input: {
  body: ClickShopBody;
  rawBody: string;
  path: string;
  headers: Record<string, string>;
  action: number;
  logMeta: {
    path: string;
    phase: "prepare" | "complete" | "unknown";
    body: ClickShopBody;
    signatureOk: boolean | null;
  };
}): Promise<ClickShopResult> {
  const { body, rawBody, path, headers, action, logMeta } = input;
  const phase = logMeta.phase;

  const providers = await getPaymentProvidersConfig();
  const config = getClickConfig(providers);

  if (!config.enabled) {
    return reply(clickFail("REQUEST_ERROR"), logMeta);
  }

  if (phase === "unknown") {
    return reply(clickFail("ACTION_NOT_FOUND"), logMeta);
  }

  const isValid = verifyClickSignature(body, config.secretKey ?? "", phase);
  logMeta.signatureOk = isValid;
  if (!isValid) {
    await paymentService.logInbound({
      provider: "CLICK",
      path,
      headers,
      rawBody,
      verified: false,
      resultNote: "SIGN_FAILED",
    });
    return reply(clickFail("SIGN_FAILED"), logMeta);
  }

  if (config.serviceId && String(body.service_id) !== String(config.serviceId)) {
    return reply(clickFail("REQUEST_ERROR"), logMeta);
  }

  const paymentId = String(body.merchant_trans_id);
  setMoneyPathContext({ paymentId });
  const providerEventId = `click:${body.click_trans_id}:${action}`;

  const cached = await paymentService.getCachedResponse<ClickShopResult>(
    "CLICK",
    providerEventId,
  );
  if (cached) {
    return reply(cached, logMeta);
  }

  const payment = await paymentRepository.findPaymentWithTravelPlanUser(paymentId);

  if (!payment || payment.provider !== "CLICK") {
    return reply(clickFail("USER_NOT_FOUND"), logMeta);
  }

  let expected: Money;
  let incoming: Money;
  try {
    expected =
      payment.amountTiyin != null
        ? Money.fromTiyin(payment.amountTiyin)
        : Money.fromSomNumber(String(payment.amount));
    incoming = Money.fromSomNumber(String(body.amount));
  } catch (err) {
    if (err instanceof MoneyError) {
      return reply(clickFail("INCORRECT_AMOUNT"), logMeta);
    }
    throw err;
  }

  if (!expected.equals(incoming)) {
    return reply(clickFail("INCORRECT_AMOUNT"), logMeta);
  }

  if (phase === "prepare") {
    if (isPaymentCaptured(payment.status)) {
      const resp = clickFail("ALREADY_PAID", {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
      });
      await paymentService.storeProcessedResponse({
        provider: "CLICK",
        providerEventId,
        rawBody,
        response: resp,
      });
      return reply(resp, logMeta);
    }

    const ptx = await paymentService.createIntent({
      provider: "CLICK",
      idempotencyKey: `click:prepare:${paymentId}:${body.click_trans_id}`,
      amountTiyin: expected.toTiyin(),
      travelPlanId: payment.travelPlanId,
      legacyPaymentId: payment.id,
      metadata: { click_trans_id: body.click_trans_id },
    });

    await paymentRepository.updatePaymentFields(paymentId, {
      externalRef: String(body.click_trans_id),
      status: "PENDING",
    });

    await paymentRepository.updatePaymentTransaction(ptx.id, {
      status: "PENDING",
      externalRef: String(body.click_trans_id),
    });

    const resp: ClickShopResult = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      merchant_prepare_id: ptx.id,
      error: CLICK_ERRORS.SUCCESS,
      error_note: CLICK_ERROR_NOTES.SUCCESS,
    };
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    await paymentService.logInbound({
      provider: "CLICK",
      path,
      headers,
      rawBody,
      verified: true,
      resultNote: `prepare error=${resp.error}`,
    });
    return reply(resp, logMeta);
  }

  // Complete (action=1).
  // Cancel is not gated on the prepare record: refusing it would strand the
  // payment in PENDING with no way for Click to cancel. Return error 0 so
  // Click treats the notification as processed (live handler behaviour).
  const inboundError = asClickNumber(body.error);
  if (inboundError < 0) {
    await paymentRepository.updatePaymentFields(paymentId, {
      status: "FAILED",
    });
    const resp: ClickShopResult = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      merchant_prepare_id: body.merchant_prepare_id,
      error: CLICK_ERRORS.SUCCESS,
      error_note: "Cancelled",
    };
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    return reply(resp, logMeta);
  }

  if (payment.status === "CANCELLED" || payment.status === "FAILED") {
    const resp = clickFail("TRANSACTION_CANCELLED", {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
    });
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    return reply(resp, logMeta);
  }

  if (isPaymentCaptured(payment.status)) {
    const resp = clickFail("ALREADY_PAID", {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
    });
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    return reply(resp, logMeta);
  }

  const prepareId =
    body.merchant_prepare_id != null ? String(body.merchant_prepare_id).trim() : "";
  if (!prepareId) {
    return reply(clickFail("TRANSACTION_NOT_EXIST"), logMeta);
  }

  const ptx = await paymentRepository.findPaymentTransactionById(prepareId);
  if (!ptx || ptx.provider !== "CLICK" || ptx.legacyPaymentId !== paymentId) {
    return reply(clickFail("TRANSACTION_NOT_EXIST"), logMeta);
  }

  if (ptx.externalRef && ptx.externalRef !== String(body.click_trans_id)) {
    return reply(clickFail("TRANSACTION_NOT_EXIST"), logMeta);
  }

  if (ptx.status === "SUCCESS") {
    const resp = clickFail("ALREADY_PAID", {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
    });
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    return reply(resp, logMeta);
  }

  const successResponse: ClickShopResult = {
    click_trans_id: body.click_trans_id,
    merchant_trans_id: paymentId,
    merchant_confirm_id: body.click_trans_id,
    error: CLICK_ERRORS.SUCCESS,
    error_note: CLICK_ERROR_NOTES.SUCCESS,
  };

  try {
    await paymentRepository.runTransaction(async (tx) => {
      const fresh = await paymentRepository.findPaymentWithTravelPlanUser(
        paymentId,
        tx,
      );
      if (!fresh || !isPaymentCaptured(fresh.status)) {
        await completeSuccessfulPaymentInTx(tx, {
          paymentId,
          travelPlanId: payment.travelPlanId,
          actorId: payment.travelPlan.userId,
          previousPaymentStatus: fresh?.status ?? payment.status,
        });
      }

      await paymentRepository.updatePaymentTransaction(
        prepareId,
        { status: "SUCCESS", externalRef: String(body.click_trans_id) },
        tx,
      );

      await paymentRepository.updatePaymentFields(
        paymentId,
        { externalRef: String(body.click_trans_id) },
        tx,
      );

      await paymentService.storeProcessedResponse(
        {
          provider: "CLICK",
          providerEventId,
          rawBody,
          response: successResponse,
        },
        tx,
      );
    });
  } catch (err) {
    console.error("[click-shop] complete update failed", err);
    return reply(clickFail("UPDATE_FAILED"), logMeta);
  }

  await paymentService.logInbound({
    provider: "CLICK",
    path,
    headers,
    rawBody,
    verified: true,
    resultNote: `complete error=${successResponse.error}`,
  });

  return reply(successResponse, logMeta);
}
