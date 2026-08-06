import type { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { db, type DbClient } from "./db";

export type Tx = DbClient;

export class PaymentRepository {
  async appendWebhookLog(input: {
    provider: string;
    path: string;
    headers: Prisma.InputJsonValue;
    rawBody: string;
    verified?: boolean | null;
    resultNote?: string | null;
  }) {
    return db.webhookLog.create({
      data: {
        provider: input.provider,
        path: input.path,
        headers: input.headers,
        rawBody: input.rawBody,
        verified: input.verified ?? null,
        resultNote: input.resultNote ?? null,
      },
    });
  }

  async findProcessedEvent(provider: string, providerEventId: string) {
    return db.processedEvent.findUnique({
      where: {
        provider_providerEventId: { provider, providerEventId },
      },
    });
  }

  async insertProcessedEvent(
    input: {
      provider: string;
      providerEventId: string;
      payloadHash: string;
      responseJson: Prisma.InputJsonValue;
    },
    client: DbClient = db,
  ) {
    try {
      return await client.processedEvent.create({
        data: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          payloadHash: input.payloadHash,
          responseJson: input.responseJson,
        },
      });
    } catch (err) {
      const existing = await client.processedEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: input.provider,
            providerEventId: input.providerEventId,
          },
        },
      });
      if (existing) return existing;
      throw err;
    }
  }

  async findPaymentTransactionByIdempotencyKey(key: string, client: DbClient = db) {
    return client.paymentTransaction.findUnique({ where: { idempotencyKey: key } });
  }

  async createPaymentTransaction(
    input: {
      provider: string;
      idempotencyKey: string;
      amountTiyin: bigint;
      currency?: string;
      status: string;
      bookingId?: string | null;
      travelPlanId?: string | null;
      legacyPaymentId?: string | null;
      externalRef?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    client: DbClient = db,
  ) {
    const existing = await this.findPaymentTransactionByIdempotencyKey(
      input.idempotencyKey,
      client,
    );
    if (existing) return existing;

    try {
      return await client.paymentTransaction.create({
        data: {
          provider: input.provider,
          idempotencyKey: input.idempotencyKey,
          amountTiyin: input.amountTiyin,
          currency: input.currency ?? "UZS",
          status: input.status,
          bookingId: input.bookingId ?? null,
          travelPlanId: input.travelPlanId ?? null,
          legacyPaymentId: input.legacyPaymentId ?? null,
          externalRef: input.externalRef ?? null,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch {
      const again = await this.findPaymentTransactionByIdempotencyKey(
        input.idempotencyKey,
        client,
      );
      if (again) return again;
      throw new Error("Failed to create PaymentTransaction");
    }
  }

  async updatePaymentTransaction(
    id: string,
    data: Record<string, unknown>,
    client: DbClient = db,
  ) {
    return client.paymentTransaction.update({ where: { id }, data });
  }

  async findPaymentTransactionById(id: string, client: DbClient = db) {
    return client.paymentTransaction.findUnique({ where: { id } });
  }

  async findByLegacyPaymentAndProvider(
    legacyPaymentId: string,
    provider: string,
    client: DbClient = db,
  ) {
    return client.paymentTransaction.findFirst({
      where: { legacyPaymentId, provider },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPaymentWithTravelPlanUser(id: string, client: DbClient = db) {
    return client.payment.findUnique({
      where: { id },
      include: { travelPlan: { select: { id: true, userId: true } } },
    });
  }

  async findPaymentByExternalRefAndProvider(
    externalRef: string,
    provider: PaymentProvider,
    client: DbClient = db,
  ) {
    return client.payment.findFirst({
      where: { externalRef, provider },
      include: { travelPlan: { select: { id: true, userId: true } } },
    });
  }

  async updatePaymentFields(
    id: string,
    data: {
      status?: PaymentStatus;
      externalRef?: string | null;
      paidAt?: Date | null;
    },
    client: DbClient = db,
  ) {
    return client.payment.update({ where: { id }, data });
  }

  /**
   * Admin payment detail: the payment plus every booking the travel plan
   * touches. Hotel bookings are matched separately because they link back
   * through `note`, not a foreign key.
   */
  async findPaymentAdminDetail(id: string, client: DbClient = db) {
    return client.payment.findUnique({
      where: { id },
      include: {
        travelPlan: {
          include: {
            user: { select: { first_name: true, last_name: true, email: true } },
            items: { orderBy: { createdAt: "asc" } },
            homeStayBookings: { select: { id: true, totalPrice: true, status: true } },
            taxiOrders: {
              select: { id: true, status: true, estimatedPrice: true, finalPrice: true },
            },
            guideBookings: { select: { id: true, totalPrice: true, status: true } },
          },
        },
      },
    });
  }

  async findPlanHotelBookings(planId: string, client: DbClient = db) {
    return client.hotelBooking.findMany({
      where: { note: { contains: planId }, source: "SAFARTRIP" },
      select: { id: true, totalAmount: true, status: true },
    });
  }

  async runTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return db.$transaction(async (tx: DbClient) => fn(tx));
  }

  async findSystemSettingValue(key: string, client: DbClient = db) {
    const setting = await client.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }
}

export const paymentRepository = new PaymentRepository();
