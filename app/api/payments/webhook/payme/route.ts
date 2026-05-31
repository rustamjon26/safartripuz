import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, verifyPaymeAuth, type PaymeRpcRequest } from "@/lib/payments/payme";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";
import { emitDidoxInvoiceForPayment } from "@/lib/didox/emitDidoxInvoiceForPayment";
import {
  getPaymentProvidersConfig,
  getPaymeConfig,
  paymeMerchantKey,
} from "@/lib/payments/providerConfig";

type PaymeError = (typeof PAYME_ERRORS)[keyof typeof PAYME_ERRORS];

function rpcError(id: number, error: PaymeError) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: error.code, message: error.message },
  });
}

function rpcSuccess(id: number, result: object) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

async function findPaymentByOrderId(orderId: string | undefined) {
  if (!orderId) return null;
  return prisma.payment.findUnique({
    where: { id: orderId },
    include: { travelPlan: { select: { id: true, userId: true } } },
  });
}

async function findPaymentByPaymeId(paymeTransId: string | undefined) {
  if (!paymeTransId) return null;
  return prisma.payment.findFirst({
    where: { externalRef: String(paymeTransId), provider: "PAYME" },
    include: { travelPlan: { select: { id: true, userId: true } } },
  });
}

export async function POST(req: Request) {
  let rpcId = 0;

  try {
    const providers = await getPaymentProvidersConfig();
    const config = getPaymeConfig(providers);
    const merchantKey = paymeMerchantKey(config);

    if (!config.enabled) {
      return rpcError(0, PAYME_ERRORS.INSUFFICIENT_PRIVILEGE);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    if (!verifyPaymeAuth(authHeader, merchantKey)) {
      return rpcError(0, PAYME_ERRORS.INSUFFICIENT_PRIVILEGE);
    }

    const body = (await req.json()) as PaymeRpcRequest;
    const { method, params, id } = body;
    rpcId = id ?? 0;

    const orderId = params?.account?.order_id;
    const paymeTransId = params?.id;

    if (method === "CheckPerformTransaction") {
      const payment = await findPaymentByOrderId(orderId);
      if (!payment || payment.provider !== "PAYME") {
        return rpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
      }

      const expectedTiyin = Math.round(Number(payment.amount) * 100);
      if (params.amount !== expectedTiyin) {
        return rpcError(id, PAYME_ERRORS.WRONG_AMOUNT);
      }

      if (payment.status === "SUCCESS") {
        return rpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID);
      }

      return rpcSuccess(id, { allow: true });
    }

    if (method === "CreateTransaction") {
      const payment = await findPaymentByOrderId(orderId);
      if (!payment || payment.provider !== "PAYME") {
        return rpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
      }

      const expectedTiyin = Math.round(Number(payment.amount) * 100);
      if (params.amount !== expectedTiyin) {
        return rpcError(id, PAYME_ERRORS.WRONG_AMOUNT);
      }

      if (payment.status === "SUCCESS") {
        return rpcError(id, PAYME_ERRORS.ORDER_ALREADY_PAID);
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalRef: String(paymeTransId),
          status: "PENDING",
        },
      });

      return rpcSuccess(id, {
        create_time: params.time ?? Date.now(),
        transaction: String(paymeTransId),
        state: 1,
      });
    }

    if (method === "PerformTransaction") {
      const payment =
        (await findPaymentByPaymeId(paymeTransId)) ??
        (await findPaymentByOrderId(orderId));

      if (!payment || payment.provider !== "PAYME") {
        return rpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
      }

      if (payment.status === "SUCCESS") {
        return rpcSuccess(id, {
          perform_time: payment.paidAt?.getTime() ?? Date.now(),
          transaction: payment.externalRef ?? String(paymeTransId),
          state: 2,
        });
      }

      await prisma.$transaction(async (tx) =>
        completeSuccessfulPaymentInTx(tx, {
          paymentId: payment.id,
          travelPlanId: payment.travelPlanId,
          actorId: payment.travelPlan.userId,
          previousPaymentStatus: payment.status,
        }),
      );

      void emitDidoxInvoiceForPayment(payment.id);

      return rpcSuccess(id, {
        perform_time: Date.now(),
        transaction: payment.externalRef ?? String(paymeTransId),
        state: 2,
      });
    }

    if (method === "CancelTransaction") {
      const payment =
        (await findPaymentByPaymeId(paymeTransId)) ??
        (await findPaymentByOrderId(orderId));

      if (!payment || payment.provider !== "PAYME") {
        return rpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
      }

      if (payment.status === "SUCCESS") {
        return rpcError(id, PAYME_ERRORS.UNABLE_TO_CANCEL);
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });

      return rpcSuccess(id, {
        cancel_time: Date.now(),
        transaction: payment.externalRef ?? String(paymeTransId),
        state: -1,
      });
    }

    if (method === "CheckTransaction") {
      const payment =
        (await findPaymentByPaymeId(paymeTransId)) ??
        (await findPaymentByOrderId(orderId));

      if (!payment || payment.provider !== "PAYME") {
        return rpcError(id, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
      }

      const stateMap: Record<string, number> = {
        INITIATED: 1,
        PENDING: 1,
        SUCCESS: 2,
        FAILED: -1,
        CANCELLED: -1,
      };

      return rpcSuccess(id, {
        create_time: payment.createdAt.getTime(),
        perform_time: payment.paidAt?.getTime() ?? 0,
        cancel_time: payment.status === "CANCELLED" || payment.status === "FAILED" ? Date.now() : 0,
        transaction: payment.externalRef ?? payment.id,
        state: stateMap[payment.status] ?? 1,
        reason: null,
      });
    }

    return rpcError(id, PAYME_ERRORS.INSUFFICIENT_PRIVILEGE);
  } catch (error) {
    console.error("[Payme webhook]", error);
    return rpcError(rpcId, PAYME_ERRORS.INSUFFICIENT_PRIVILEGE);
  }
}
