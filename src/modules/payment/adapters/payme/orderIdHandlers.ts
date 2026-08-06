import { Money } from "@/src/shared/money";
import { completeSuccessfulPaymentInTx } from "@/src/modules/booking";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";
import {
  isPaymeErrorResponse,
  PAYME_ERRORS,
  paymeRpcError,
  paymeRpcSuccess,
} from "../../domain/errors";
import { buildPaymeReceiptDetail } from "../../domain/payme-receipt";
import { paymentRepository } from "../../repository/payment.repository";
import { isPaymentCaptured } from "../../domain/payment-status";
import { paymentService } from "../../service/payment.service";

type Params = {
  id?: string;
  time?: number;
  amount?: number;
  account?: { order_id?: string; booking_id?: string };
  reason?: number;
  fiscal?: unknown;
};

async function findPaymentByOrderId(orderId: string | undefined) {
  if (!orderId) return null;
  return paymentRepository.findPaymentWithTravelPlanUser(orderId);
}

async function findPaymentByPaymeId(paymeTransId: string | undefined) {
  if (!paymeTransId) return null;
  return paymentRepository.findPaymentByExternalRefAndProvider(
    String(paymeTransId),
    "PAYME",
  );
}

/** Prefer the tiyin SoT column; fall back to Decimal som via exact string. */
function expectedTiyin(payment: {
  amount: { toString(): string };
  amountTiyin: bigint | null;
}): bigint {
  if (payment.amountTiyin != null) return payment.amountTiyin;
  return Money.fromSomNumber(payment.amount.toString()).toTiyin();
}

export async function handleOrderIdMethod(
  method: string,
  rpcId: number,
  params: Params,
  rawBody: string,
): Promise<object> {
  const orderId = params?.account?.order_id;
  const paymeTransId = params?.id != null ? String(params.id) : undefined;
  const providerEventId = `payme:order:${method}:${paymeTransId ?? orderId ?? "none"}`;

  const cached = await paymentService.getCachedResponse<object>("PAYME", providerEventId);
  if (cached) return cached;

  const respond = async (response: object) => {
    // Cache mutating / idempotent success paths. Never an error envelope — a
    // memoized transient failure would be replayed to every Payme retry.
    if (
      !isPaymeErrorResponse(response) &&
      (method === "PerformTransaction" ||
        method === "CreateTransaction" ||
        method === "CancelTransaction" ||
        method === "SetFiscalData")
    ) {
      await paymentService.storeProcessedResponse({
        provider: "PAYME",
        providerEventId,
        rawBody,
        response,
      });
    }
    return response;
  };

  if (method === "CheckPerformTransaction") {
    const payment = await findPaymentByOrderId(orderId);
    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.INVALID_ACCOUNT, "order_id");
    }
    const amountTiyin = expectedTiyin(payment);
    if (params.amount == null || BigInt(params.amount) !== amountTiyin) {
      return paymeRpcError(rpcId, PAYME_ERRORS.WRONG_AMOUNT);
    }
    if (isPaymentCaptured(payment.status)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.ORDER_ALREADY_PAID);
    }
    // Fiscal detail required for Soliq turnover (Shohjahon / Merchant API).
    return paymeRpcSuccess(rpcId, {
      allow: true,
      detail: buildPaymeReceiptDetail({
        title: "SafarTrip sayohat to'lovi",
        priceTiyin: Number(amountTiyin),
      }),
    });
  }

  if (method === "CreateTransaction") {
    const payment = await findPaymentByOrderId(orderId);
    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.INVALID_ACCOUNT, "order_id");
    }
    if (params.amount == null || BigInt(params.amount) !== expectedTiyin(payment)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.WRONG_AMOUNT);
    }
    if (isPaymentCaptured(payment.status)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.ORDER_ALREADY_PAID);
    }

    await paymentService.createIntent({
      provider: "PAYME",
      idempotencyKey: `payme:create:${payment.id}:${paymeTransId}`,
      amountTiyin: expectedTiyin(payment),
      travelPlanId: payment.travelPlanId,
      legacyPaymentId: payment.id,
      metadata: { paymeId: paymeTransId },
    });

    await paymentRepository.updatePaymentFields(payment.id, {
      externalRef: String(paymeTransId),
      status: "PENDING",
    });

    return respond(
      paymeRpcSuccess(rpcId, {
        create_time: params.time ?? Date.now(),
        transaction: String(paymeTransId),
        state: 1,
      }),
    );
  }

  if (method === "PerformTransaction") {
    const payment =
      (await findPaymentByPaymeId(paymeTransId)) ?? (await findPaymentByOrderId(orderId));

    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
    }

    setMoneyPathContext({ paymentId: payment.id });

    if (isPaymentCaptured(payment.status)) {
      return respond(
        paymeRpcSuccess(rpcId, {
          perform_time: payment.paidAt?.getTime() ?? Date.now(),
          transaction: payment.externalRef ?? String(paymeTransId),
          state: 2,
        }),
      );
    }

    const response = paymeRpcSuccess(rpcId, {
      perform_time: Date.now(),
      transaction: payment.externalRef ?? String(paymeTransId),
      state: 2,
    });

    await paymentRepository.runTransaction(async (tx) => {
      // Ledger + outbox (Didox/receipts) inside completeSuccessfulPaymentInTx.
      // The payment row lock inside serializes concurrent PerformTransaction.
      await completeSuccessfulPaymentInTx(tx, {
        paymentId: payment.id,
        travelPlanId: payment.travelPlanId,
        actorId: payment.travelPlan.userId,
        previousPaymentStatus: payment.status,
      });

      // ProcessedEvent commits atomically with the business effects — a crash
      // between "work done" and "dedup recorded" can no longer double-apply.
      await paymentService.storeProcessedResponse(
        { provider: "PAYME", providerEventId, rawBody, response },
        tx,
      );
    });

    return response;
  }

  if (method === "CancelTransaction") {
    const payment =
      (await findPaymentByPaymeId(paymeTransId)) ?? (await findPaymentByOrderId(orderId));

    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
    }

    if (isPaymentCaptured(payment.status)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.UNABLE_TO_CANCEL);
    }

    await paymentRepository.updatePaymentFields(payment.id, {
      status: "CANCELLED",
    });

    return respond(
      paymeRpcSuccess(rpcId, {
        cancel_time: Date.now(),
        transaction: payment.externalRef ?? String(paymeTransId),
        state: -1,
      }),
    );
  }

  if (method === "CheckTransaction") {
    const payment =
      (await findPaymentByPaymeId(paymeTransId)) ?? (await findPaymentByOrderId(orderId));

    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
    }

    // Payme only cares that the money was captured; PENDING_REVIEW is our own
    // bookkeeping gap, so the transaction must still report as performed.
    const state = isPaymentCaptured(payment.status)
      ? 2
      : payment.status === "CANCELLED"
        ? -1
        : 1;

    return paymeRpcSuccess(rpcId, {
      create_time: payment.createdAt.getTime(),
      perform_time: payment.paidAt?.getTime() ?? 0,
      cancel_time: payment.status === "CANCELLED" ? payment.updatedAt.getTime() : 0,
      transaction: payment.externalRef ?? String(paymeTransId ?? ""),
      state,
      reason: payment.status === "CANCELLED" ? (params.reason ?? 4) : null,
    });
  }

  if (method === "GetStatement") {
    return paymeRpcSuccess(rpcId, { transactions: [] });
  }

  if (method === "SetFiscalData") {
    const payment =
      (await findPaymentByPaymeId(paymeTransId)) ?? (await findPaymentByOrderId(orderId));
    if (!payment) {
      return paymeRpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
    }
    await paymentService.createIntent({
      provider: "PAYME",
      idempotencyKey: `payme:fiscal:${payment.id}:${paymeTransId ?? "x"}`,
      amountTiyin: expectedTiyin(payment),
      legacyPaymentId: payment.id,
      travelPlanId: payment.travelPlanId,
      metadata: { fiscal: params.fiscal ?? params },
    });
    return respond(paymeRpcSuccess(rpcId, { success: true }));
  }

  return paymeRpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND);
}
