import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLICK_ERRORS, verifyClickSignature, type ClickPrepareBody } from "@/lib/payments/click";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";
import { emitDidoxInvoiceForPayment } from "@/lib/didox/emitDidoxInvoiceForPayment";
import { getClickConfig, getPaymentProvidersConfig } from "@/lib/payments/providerConfig";

async function parseClickBody(req: Request): Promise<ClickPrepareBody> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as ClickPrepareBody;
  }
  const form = await req.formData();
  const getNum = (key: string) => Number(form.get(key) ?? 0);
  const getStr = (key: string) => String(form.get(key) ?? "");
  return {
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
    merchant_prepare_id: getNum("merchant_prepare_id") || undefined,
  };
}

function clickResponse(payload: Record<string, unknown>) {
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  try {
    const body = await parseClickBody(req);
    const providers = await getPaymentProvidersConfig();
    const config = getClickConfig(providers);

    if (!config.enabled) {
      return clickResponse({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Click o'chirilgan",
      });
    }

    const isValid = verifyClickSignature(body, config.secretKey ?? "");
    if (!isValid) {
      return clickResponse({
        error: CLICK_ERRORS.SIGN_FAILED,
        error_note: "Signature tekshiruvi muvaffaqiyatsiz",
      });
    }

    if (config.serviceId && String(body.service_id) !== String(config.serviceId)) {
      return clickResponse({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Service ID mos kelmaydi",
      });
    }

    const paymentId = body.merchant_trans_id;
    const action = body.action;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { travelPlan: { select: { id: true, userId: true } } },
    });

    if (!payment || payment.provider !== "CLICK") {
      return clickResponse({
        error: CLICK_ERRORS.TRANSACTION_NOT_FOUND,
        error_note: "To'lov topilmadi",
      });
    }

    const expectedAmount = Number(payment.amount);
    if (Math.abs(body.amount - expectedAmount) > 1) {
      return clickResponse({
        error: CLICK_ERRORS.INCORRECT_PARAMS,
        error_note: "Summa mos kelmaydi",
      });
    }

    if (action === 0) {
      if (payment.status === "SUCCESS") {
        return clickResponse({
          error: CLICK_ERRORS.TRANSACTION_COMPLETED,
          error_note: "Allaqachon to'langan",
        });
      }

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          externalRef: String(body.click_trans_id),
          status: "PENDING",
        },
      });

      return clickResponse({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
        merchant_prepare_id: body.click_trans_id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: "Success",
      });
    }

    if (action === 1) {
      if (body.error < 0) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: "FAILED" },
        });
        return clickResponse({
          click_trans_id: body.click_trans_id,
          merchant_trans_id: paymentId,
          error: CLICK_ERRORS.SUCCESS,
          error_note: "Cancelled",
        });
      }

      if (payment.status === "SUCCESS") {
        return clickResponse({
          click_trans_id: body.click_trans_id,
          merchant_trans_id: paymentId,
          merchant_confirm_id: body.click_trans_id,
          error: CLICK_ERRORS.SUCCESS,
          error_note: "Success",
        });
      }

      await prisma.$transaction(async (tx) =>
        completeSuccessfulPaymentInTx(tx, {
          paymentId,
          travelPlanId: payment.travelPlanId,
          actorId: payment.travelPlan.userId,
          previousPaymentStatus: payment.status,
        }),
      );

      await prisma.payment.update({
        where: { id: paymentId },
        data: { externalRef: String(body.click_trans_id) },
      });

      void emitDidoxInvoiceForPayment(paymentId);

      return clickResponse({
        click_trans_id: body.click_trans_id,
        merchant_trans_id: paymentId,
        merchant_confirm_id: body.click_trans_id,
        error: CLICK_ERRORS.SUCCESS,
        error_note: "Success",
      });
    }

    return clickResponse({
      error: CLICK_ERRORS.ACTION_NOT_FOUND,
      error_note: "Action topilmadi",
    });
  } catch (error) {
    console.error("[Click webhook]", error);
    return clickResponse({
      error: CLICK_ERRORS.INCORRECT_PARAMS,
      error_note: "Server xatoligi",
    });
  }
}
