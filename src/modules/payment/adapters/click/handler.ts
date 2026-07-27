import { NextResponse } from "next/server";
import { Money } from "@/src/shared/money";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";
import { getClickConfig, getPaymentProvidersConfig } from "@/lib/payments/providerConfig";
import { CLICK_ERRORS } from "../../domain/errors";
import { paymentRepository } from "../../repository/payment.repository";
import { paymentService } from "../../service/payment.service";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";
import { verifyClickSignature, type ClickSignFields } from "./sign";

export type ClickBody = ClickSignFields & {
  click_paydoc_id?: number;
  error: number;
  error_note: string;
  sign_string: string;
  merchant_prepare_id?: number | string;
};

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function parseClickBody(req: Request): Promise<{ body: ClickBody; rawBody: string }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const rawBody = await req.text();
    return { body: JSON.parse(rawBody) as ClickBody, rawBody };
  }
  const form = await req.formData();
  const getNum = (key: string) => Number(form.get(key) ?? 0);
  const getStr = (key: string) => String(form.get(key) ?? "");
  const body: ClickBody = {
    click_trans_id: getNum("click_trans_id"),
    service_id: getNum("service_id"),
    click_paydoc_id: getNum("click_paydoc_id") || undefined,
    merchant_trans_id: getStr("merchant_trans_id"),
    amount: getNum("amount"),
    action: getNum("action"),
    error: getNum("error"),
    error_note: getStr("error_note"),
    sign_time: getStr("sign_time"),
    sign_string: getStr("sign_string"),
    merchant_prepare_id: form.get("merchant_prepare_id")
      ? getStr("merchant_prepare_id")
      : undefined,
  };
  const rawBody = JSON.stringify(body);
  return { body, rawBody };
}

function clickJson(payload: Record<string, unknown>) {
  return NextResponse.json(payload);
}

export async function clickHttpHandler(req: Request) {
  const path = "/api/payments/webhook/click";
  let rawBody = "";
  try {
    const parsed = await parseClickBody(req);
    rawBody = parsed.rawBody;
    const body = parsed.body;
    const action = Number(body.action);

    await paymentService.logInbound({
      provider: "CLICK",
      path,
      headers: headersToRecord(req.headers),
      rawBody,
      verified: null,
    });

    const providers = await getPaymentProvidersConfig();
    const config = getClickConfig(providers);

    if (!config.enabled) {
      return clickJson({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Click o'chirilgan",
      });
    }

    const phase = action === 0 ? "prepare" : action === 1 ? "complete" : null;
    if (!phase) {
      return clickJson({
        error: CLICK_ERRORS.ACTION_NOT_FOUND,
        error_note: "Action topilmadi",
      });
    }

    const isValid = verifyClickSignature(body, config.secretKey ?? "", phase);
    if (!isValid) {
      await paymentService.logInbound({
        provider: "CLICK",
        path,
        headers: headersToRecord(req.headers),
        rawBody,
        verified: false,
        resultNote: "SIGN_FAILED",
      });
      return clickJson({
        error: CLICK_ERRORS.SIGN_FAILED,
        error_note: "Signature tekshiruvi muvaffaqiyatsiz",
      });
    }

    if (config.serviceId && String(body.service_id) !== String(config.serviceId)) {
      return clickJson({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Service ID mos kelmaydi",
      });
    }

    const paymentId = String(body.merchant_trans_id);
    setMoneyPathContext({ paymentId });
    const providerEventId = `click:${body.click_trans_id}:${action}`;

    const cached = await paymentService.getCachedResponse<Record<string, unknown>>(
      "CLICK",
      providerEventId,
    );
    if (cached) {
      return clickJson(cached);
    }

    const payment = await paymentRepository.findPaymentWithTravelPlanUser(paymentId);

    if (!payment || payment.provider !== "CLICK") {
      return clickJson({
        error: CLICK_ERRORS.TRANSACTION_NOT_FOUND,
        error_note: "To'lov topilmadi",
      });
    }

    const expected = Money.fromSomNumber(Number(payment.amount));
    const incoming = Money.fromSomNumber(Number(body.amount));
    if (!expected.equals(incoming)) {
      return clickJson({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Summa mos kelmaydi",
      });
    }

    if (action === 0) {
      if (payment.status === "SUCCESS") {
        const resp = {
          error: CLICK_ERRORS.ALREADY_PAID,
          error_note: "Allaqachon to'langan",
        };
        await paymentService.storeProcessedResponse({
          provider: "CLICK",
          providerEventId,
          rawBody,
          response: resp,
        });
        return clickJson(resp);
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

      const resp = {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
        merchant_prepare_id: ptx.id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: "Success",
      };
      await paymentService.storeProcessedResponse({
        provider: "CLICK",
        providerEventId,
        rawBody,
        response: resp,
      });
      return clickJson(resp);
    }

    // Complete (action=1)
    if (body.error < 0) {
      await paymentRepository.updatePaymentFields(paymentId, {
        status: "FAILED",
      });
      const resp = {
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
        error: CLICK_ERRORS.SUCCESS,
        error_note: "Cancelled",
      };
      await paymentService.storeProcessedResponse({
        provider: "CLICK",
        providerEventId,
        rawBody,
        response: resp,
      });
      return clickJson(resp);
    }

    if (payment.status === "CANCELLED") {
      const resp = {
        error: CLICK_ERRORS.ORDER_CANCELLED,
        error_note: "Buyurtma bekor qilingan",
      };
      await paymentService.storeProcessedResponse({
        provider: "CLICK",
        providerEventId,
        rawBody,
        response: resp,
      });
      return clickJson(resp);
    }

    if (payment.status === "SUCCESS") {
      const resp = {
        error: CLICK_ERRORS.ALREADY_PAID,
        error_note: "Allaqachon to'langan",
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
      };
      await paymentService.storeProcessedResponse({
        provider: "CLICK",
        providerEventId,
        rawBody,
        response: resp,
      });
      return clickJson(resp);
    }

    // Validate merchant_prepare_id matches our PaymentTransaction
    const prepareId = body.merchant_prepare_id != null ? String(body.merchant_prepare_id) : "";
    if (prepareId) {
      const ptx = await paymentRepository.findPaymentTransactionById(prepareId);
      if (!ptx || ptx.legacyPaymentId !== paymentId) {
        return clickJson({
          error: CLICK_ERRORS.INCORRECT_PARAMS,
          error_note: "merchant_prepare_id noto'g'ri",
        });
      }
    }

    const successResponse = {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: paymentId,
      merchant_confirm_id: body.click_trans_id,
      error: CLICK_ERRORS.SUCCESS,
      error_note: "Success",
    };

    await paymentRepository.runTransaction(async (tx) => {
      await completeSuccessfulPaymentInTx(tx, {
        paymentId,
        travelPlanId: payment.travelPlanId,
        actorId: payment.travelPlan.userId,
        previousPaymentStatus: payment.status,
      });

      // Ledger posted inside completeSuccessfulPaymentInTx (per-booking keys payment:{id}:booking:{bookingId}:success)

      if (prepareId) {
        await paymentRepository.updatePaymentTransaction(
          prepareId,
          { status: "SUCCESS", externalRef: String(body.click_trans_id) },
          tx,
        );
      }

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

    await paymentRepository.updatePaymentFields(paymentId, {
      externalRef: String(body.click_trans_id),
    });

    // Didox + receipts enqueued inside completeSuccessfulPaymentInTx (outbox)

    return clickJson(successResponse);
  } catch (error) {
    console.error("[Click webhook]", error);
    return clickJson({
      error: CLICK_ERRORS.INCORRECT_PARAMS,
      error_note: "Server xatoligi",
    });
  }
}
