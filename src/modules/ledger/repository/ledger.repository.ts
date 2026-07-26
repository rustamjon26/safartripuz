import type { AccountType } from "@prisma/client";
import { db, type DbClient } from "@/src/modules/payment/repository/db";

export type Tx = DbClient;

export class LedgerRepository {
  async findTransactionByIdempotencyKey(key: string, client: DbClient = db) {
    return client.ledgerTransaction.findUnique({
      where: { idempotencyKey: key },
      include: { entries: true },
    });
  }

  async ensureAccount(
    input: {
      type: AccountType | string;
      ownerType: string;
      ownerId: string;
      currency?: string;
    },
    client: DbClient = db,
  ) {
    const currency = input.currency ?? "UZS";
    return client.ledgerAccount.upsert({
      where: {
        ownerType_ownerId_type_currency: {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          type: input.type,
          currency,
        },
      },
      create: {
        type: input.type,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        currency,
      },
      update: {},
    });
  }

  async createTransactionWithEntries(
    input: {
      bookingId?: string | null;
      type: string;
      idempotencyKey: string;
      entries: Array<{ accountId: string; amount: bigint; direction: string }>;
    },
    client: Tx,
  ) {
    return client.ledgerTransaction.create({
      data: {
        bookingId: input.bookingId ?? null,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        entries: {
          create: input.entries.map((e) => ({
            accountId: e.accountId,
            amount: e.amount,
            direction: e.direction,
          })),
        },
      },
      include: { entries: true },
    });
  }
}

export const ledgerRepository = new LedgerRepository();
