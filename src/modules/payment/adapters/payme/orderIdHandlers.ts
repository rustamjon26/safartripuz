import { Money } from "@/src/shared/money";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";
import { setMoneyPathContext } from "@/src/shared/observability/sentry";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../../domain/errors";
import { paymentRepository } from "../../repository/payment.repository";
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

function expectedTiyin(paymentAmount: unknown): bigint {
  return Money.fromSomNumber(Number(paymentAmount)).toTiyin();
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
    // Cache mutating / idempotent success paths
    if (
      method === "PerformTransaction" ||
      method === "CreateTransaction" ||
      method === "CancelTransaction" ||
      method === "SetFiscalData"
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
    if (params.amount == null || BigInt(params.amount) !== expectedTiyin(payment.amount)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.WRONG_AMOUNT);
    }
    if (payment.status === "SUCCESS") {
      return paymeRpcError(rpcId, PAYME_ERRORS.ORDER_ALREADY_PAID);
    }
    return paymeRpcSuccess(rpcId, { allow: true });
  }

  if (method === "CreateTransaction") {
    const payment = await findPaymentByOrderId(orderId);
    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.INVALID_ACCOUNT, "order_id");
    }
    if (params.amount == null || BigInt(params.amount) !== expectedTiyin(payment.amount)) {
      return paymeRpcError(rpcId, PAYME_ERRORS.WRONG_AMOUNT);
    }
    if (payment.status === "SUCCESS") {
      return paymeRpcError(rpcId, PAYME_ERRORS.ORDER_ALREADY_PAID);
    }

    await paymentService.createIntent({
      provider: "PAYME",
      idempotencyKey: `payme:create:${payment.id}:${paymeTransId}`,
      amountTiyin: expectedTiyin(payment.amount),
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

    if (payment.status === "SUCCESS") {
      return respond(
        paymeRpcSuccess(rpcId, {
          perform_time: payment.paidAt?.getTime() ?? Date.now(),
          transaction: payment.externalRef ?? String(paymeTransId),
          state: 2,
        }),
      );
    }

    await paymentRepository.runTransaction(async (tx) => {
      // Ledger + outbox (Didox/receipts) inside completeSuccessfulPaymentInTx
      await completeSuccessfulPaymentInTx(tx, {
        paymentId: payment.id,
        travelPlanId: payment.travelPlanId,
        actorId: payment.travelPlan.userId,
        previousPaymentStatus: payment.status,
      });
    });

    return respond(
      paymeRpcSuccess(rpcId, {
        perform_time: Date.now(),
        transaction: payment.externalRef ?? String(paymeTransId),
        state: 2,
      }),
    );
  }

  if (method === "CancelTransaction") {
    const payment =
      (await findPaymentByPaymeId(paymeTransId)) ?? (await findPaymentByOrderId(orderId));

    if (!payment || payment.provider !== "PAYME") {
      return paymeRpcError(rpcId, PAYME_ERRORS.TRANSACTION_NOT_FOUND);
    }

    if (payment.status === "SUCCESS") {
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

    const state =
      payment.status === "SUCCESS" ? 2 : payment.status === "CANCELLED" ? -1 : 1;

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
      amountTiyin: expectedTiyin(payment.amount),
      legacyPaymentId: payment.id,
      travelPlanId: payment.travelPlanId,
      metadata: { fiscal: params.fiscal ?? params },
    });
    return respond(paymeRpcSuccess(rpcId, { success: true }));
  }

  return paymeRpcError(rpcId, PAYME_ERRORS.METHOD_NOT_FOUND);
}
