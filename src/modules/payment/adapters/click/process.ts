import { Money, MoneyError } from "@/src/shared/money";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";
import { getClickConfig, getPaymentProvidersConfig } from "@/lib/payments/providerConfig";
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

export async function processClickShop(input: {
  body: ClickShopBody;
  rawBody: string;
  path: string;
  headers?: Record<string, string>;
}): Promise<ClickShopResult> {
  const { body, rawBody, path, headers = {} } = input;
  const action = asClickNumber(body.action);
  const phase = action === 0 ? "prepare" : action === 1 ? "complete" : "unknown";

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

  const providers = await getPaymentProvidersConfig();
  const config = getClickConfig(providers);

  if (!config.enabled) {
    return reply(
      {
        error: CLICK_ERRORS.REQUEST_ERROR,
        error_note: CLICK_ERROR_NOTES.REQUEST_ERROR,
      },
      logMeta,
    );
  }

  if (phase === "unknown") {
    return reply(
      {
        error: CLICK_ERRORS.ACTION_NOT_FOUND,
        error_note: CLICK_ERROR_NOTES.ACTION_NOT_FOUND,
      },
      logMeta,
    );
  }

  if (phase === "complete") {
    const prepareId = body.merchant_prepare_id;
    if (prepareId === undefined || prepareId === null || String(prepareId) === "") {
      return reply(
        {
          error: CLICK_ERRORS.REQUEST_ERROR,
          error_note: CLICK_ERROR_NOTES.REQUEST_ERROR,
        },
        logMeta,
      );
    }
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
    return reply(
      {
        error: CLICK_ERRORS.SIGN_FAILED,
        error_note: CLICK_ERROR_NOTES.SIGN_FAILED,
      },
      logMeta,
    );
  }

  if (config.serviceId && String(body.service_id) !== String(config.serviceId)) {
    return reply(
      {
        error: CLICK_ERRORS.REQUEST_ERROR,
        error_note: CLICK_ERROR_NOTES.REQUEST_ERROR,
      },
      logMeta,
    );
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
    return reply(
      {
        error: CLICK_ERRORS.USER_NOT_FOUND,
        error_note: CLICK_ERROR_NOTES.USER_NOT_FOUND,
      },
      logMeta,
    );
  }

  let expected: Money;
  let incoming: Money;
  try {
    expected = Money.fromSomNumber(String(payment.amount));
    incoming = Money.fromSomNumber(String(body.amount));
  } catch (err) {
    if (err instanceof MoneyError) {
      return reply(
        {
          error: CLICK_ERRORS.INCORRECT_AMOUNT,
          error_note: CLICK_ERROR_NOTES.INCORRECT_AMOUNT,
        },
        logMeta,
      );
    }
    throw err;
  }

  if (!expected.equals(incoming)) {
    return reply(
      {
        error: CLICK_ERRORS.INCORRECT_AMOUNT,
        error_note: CLICK_ERROR_NOTES.INCORRECT_AMOUNT,
      },
      logMeta,
    );
  }

  if (phase === "prepare") {
    if (payment.status === "SUCCESS") {
      const resp: ClickShopResult = {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
        error: CLICK_ERRORS.ALREADY_PAID,
        error_note: CLICK_ERROR_NOTES.ALREADY_PAID,
      };
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

  // Complete (action=1)
  const inboundError = asClickNumber(body.error);
  if (inboundError < 0) {
    await paymentRepository.updatePaymentFields(paymentId, {
      status: "FAILED",
    });
    const resp: ClickShopResult = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      merchant_prepare_id: body.merchant_prepare_id,
      error: CLICK_ERRORS.TRANSACTION_CANCELLED,
      error_note: CLICK_ERROR_NOTES.TRANSACTION_CANCELLED,
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
    const resp: ClickShopResult = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      error: CLICK_ERRORS.TRANSACTION_CANCELLED,
      error_note: CLICK_ERROR_NOTES.TRANSACTION_CANCELLED,
    };
    await paymentService.storeProcessedResponse({
      provider: "CLICK",
      providerEventId,
      rawBody,
      response: resp,
    });
    return reply(resp, logMeta);
  }

  const prepareId = String(body.merchant_prepare_id);
  const ptx = await paymentRepository.findPaymentTransactionById(prepareId);
  if (!ptx || ptx.legacyPaymentId !== paymentId) {
    return reply(
      {
        error: CLICK_ERRORS.TRANSACTION_NOT_FOUND,
        error_note: CLICK_ERROR_NOTES.TRANSACTION_NOT_FOUND,
      },
      logMeta,
    );
  }

  if (payment.status === "SUCCESS") {
    const resp: ClickShopResult = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      merchant_confirm_id: ptx.id,
      error: CLICK_ERRORS.ALREADY_PAID,
      error_note: CLICK_ERROR_NOTES.ALREADY_PAID,
    };
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
    merchant_confirm_id: ptx.id,
    error: CLICK_ERRORS.SUCCESS,
    error_note: CLICK_ERROR_NOTES.SUCCESS,
  };

  try {
    await paymentRepository.runTransaction(async (tx) => {
      const fresh = await paymentRepository.findPaymentWithTravelPlanUser(paymentId, tx);
      if (!fresh || fresh.status !== "SUCCESS") {
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
    return reply(
      {
        error: CLICK_ERRORS.UPDATE_FAILED,
        error_note: CLICK_ERROR_NOTES.UPDATE_FAILED,
      },
      logMeta,
    );
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
