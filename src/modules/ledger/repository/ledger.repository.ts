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
        type: input.type as AccountType,
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

  /**
   * LIABILITY / REVENUE style: CREDIT − DEBIT (tiyin).
   * ASSET style callers should negate if needed.
   */
  async getAccountSignedBalanceTiyin(
    accountId: string,
    client: DbClient = db,
  ): Promise<bigint> {
    const rows = await client.ledgerEntry.groupBy({
      by: ["direction"],
      where: { accountId },
      _sum: { amount: true },
    });
    let credit = 0n;
    let debit = 0n;
    for (const row of rows) {
      const sum = BigInt(row._sum.amount?.toString() ?? "0");
      if (row.direction === "CREDIT") credit = sum;
      if (row.direction === "DEBIT") debit = sum;
    }
    return credit - debit;
  }

  async sumPlatformRevenueTiyin(
    opts: { from?: Date; to?: Date } = {},
    client: DbClient = db,
  ): Promise<bigint> {
    const revenue = await this.ensureAccount(
      { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
      client,
    );
    const entries = await client.ledgerEntry.findMany({
      where: {
        accountId: revenue.id,
        ...(opts.from || opts.to
          ? {
              transaction: {
                createdAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
            }
          : {}),
      },
      select: { amount: true, direction: true },
    });
    let bal = 0n;
    for (const e of entries) {
      const amt = BigInt(e.amount.toString());
      bal += e.direction === "CREDIT" ? amt : -amt;
    }
    return bal;
  }

  async getPartnerPayableTiyin(
    partnerUserId: string,
    client: DbClient = db,
  ): Promise<bigint> {
    const payable = await this.ensureAccount(
      {
        type: "LIABILITY",
        ownerType: "PARTNER",
        ownerId: partnerUserId,
      },
      client,
    );
    return this.getAccountSignedBalanceTiyin(payable.id, client);
  }

  /**
   * Platform REVENUE (CREDIT − DEBIT) on ledger txs that also touch this
   * partner's payable — attributed commission for that partner's bookings.
   * PLATFORM-owned payments (no partner payable line) are excluded.
   */
  async sumPartnerAttributedCommissionTiyin(
    partnerUserId: string,
    client: DbClient = db,
  ): Promise<bigint> {
    const payable = await this.ensureAccount(
      {
        type: "LIABILITY",
        ownerType: "PARTNER",
        ownerId: partnerUserId,
      },
      client,
    );
    const revenue = await this.ensureAccount(
      { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
      client,
    );

    const partnerTxRows = await client.ledgerEntry.findMany({
      where: { accountId: payable.id },
      select: { transactionId: true },
      distinct: ["transactionId"],
    });
    const txIds = partnerTxRows.map((r: { transactionId: string }) => r.transactionId);
    if (txIds.length === 0) return 0n;

    const revEntries = await client.ledgerEntry.findMany({
      where: {
        accountId: revenue.id,
        transactionId: { in: txIds },
      },
      select: { amount: true, direction: true },
    });

    let bal = 0n;
    for (const e of revEntries) {
      const amt = BigInt(e.amount.toString());
      bal += e.direction === "CREDIT" ? amt : -amt;
    }
    return bal;
  }
}

export const ledgerRepository = new LedgerRepository();
