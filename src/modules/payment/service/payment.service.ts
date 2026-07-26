import type { Prisma } from "@prisma/client";
import { payloadHash } from "../domain/hash";
import { paymentRepository, type Tx } from "../repository/payment.repository";

export type InboundProcessResult<T> =
  | { kind: "cached"; response: T }
  | { kind: "fresh"; response: T };

/**
 * Shared inbound webhook pipeline:
 * 1) Append WebhookLog
 * 2) Dedup via ProcessedEvent
 * 3) Caller runs adapter + DB work, then stores ProcessedEvent
 */
export class PaymentService {
  async logInbound(input: {
    provider: string;
    path: string;
    headers: Record<string, string>;
    rawBody: string;
    verified?: boolean | null;
    resultNote?: string | null;
  }) {
    try {
      await paymentRepository.appendWebhookLog({
        provider: input.provider,
        path: input.path,
        headers: input.headers as Prisma.InputJsonValue,
        rawBody: input.rawBody,
        verified: input.verified,
        resultNote: input.resultNote,
      });
    } catch (err) {
      // Logging must not break payment processing
      console.error("[payment] WebhookLog append failed", err);
    }
  }

  async getCachedResponse<T = unknown>(
    provider: string,
    providerEventId: string,
  ): Promise<T | null> {
    const row = await paymentRepository.findProcessedEvent(provider, providerEventId);
    if (!row) return null;
    return row.responseJson as T;
  }

  async storeProcessedResponse(
    input: {
      provider: string;
      providerEventId: string;
      rawBody: string;
      response: unknown;
    },
    client?: Tx,
  ) {
    return paymentRepository.insertProcessedEvent(
      {
        provider: input.provider,
        providerEventId: input.providerEventId,
        payloadHash: payloadHash(input.rawBody),
        responseJson: input.response as Prisma.InputJsonValue,
      },
      client ?? undefined,
    );
  }

  async createIntent(input: {
    provider: "PAYME" | "CLICK";
    idempotencyKey: string;
    amountTiyin: bigint;
    travelPlanId?: string | null;
    bookingId?: string | null;
    legacyPaymentId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return paymentRepository.createPaymentTransaction({
      provider: input.provider,
      idempotencyKey: input.idempotencyKey,
      amountTiyin: input.amountTiyin,
      status: "INITIATED",
      travelPlanId: input.travelPlanId,
      bookingId: input.bookingId,
      legacyPaymentId: input.legacyPaymentId,
      metadata: input.metadata,
    });
  }
}

export const paymentService = new PaymentService();
