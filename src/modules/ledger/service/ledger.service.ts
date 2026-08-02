import { assertBalanced } from "../domain/balance";
import {
  calcPlatformCommissionTiyin,
  splitBookingCommission,
} from "../domain/commission";
import { LedgerTxType, UNATTRIBUTED_OWNER } from "../domain/types";
import { ledgerRepository, type Tx } from "../repository/ledger.repository";

export class MissingPartnerError extends Error {
  readonly code = "MISSING_PARTNER" as const;
  constructor(message = "Partner user id required for booking payment ledger post") {
    super(message);
    this.name = "MissingPartnerError";
  }
}

/** Inventory/booking payout routing — mirrors Prisma `PayoutOwnerType`. */
export type PayoutOwnerType = "PLATFORM" | "PARTNER";

export type PostBookingPaymentInput = {
  idempotencyKey: string;
  bookingId?: string | null;
  grossTiyin: bigint;
  /**
   * Required when payoutOwnerType is PARTNER (default).
   * Ignored for PLATFORM (100% platform revenue, no payable / PE).
   */
  partnerUserId?: string | null;
  /** PLATFORM = company-operated; PARTNER = split + PartnerEarning. Default PARTNER. */
  payoutOwnerType?: PayoutOwnerType;
  /** Platform commission percent (default 10). Unused when PLATFORM. */
  ratePercent?: number;
};

export type PostRefundInput = {
  idempotencyKey: string;
  bookingId?: string | null;
  refundTiyin: bigint;
  refundPercent: number;
  originalCommissionTiyin: bigint;
  /** Prefer real partner; if null and allowUnattributed, posts to UNATTRIBUTED. */
  partnerUserId?: string | null;
  allowUnattributed?: boolean;
  /** When PLATFORM, clawback is 100% from platform revenue (no partner payable). */
  payoutOwnerType?: PayoutOwnerType;
  /** When true (e.g. payable already paid out), type = CLAWBACK. */
  afterPayout?: boolean;
  /** Override inferred REFUND / PARTIAL_REFUND / CLAWBACK. */
  typeOverride?: string;
};

export class LedgerService {
  /**
   * Post a balanced booking payment:
   * DEBIT Platform Clearing (gross)
   * CREDIT Partner Payable (net) + Platform Revenue (commission)
   *   — or, when payoutOwnerType=PLATFORM: CREDIT Platform Revenue (gross)
   * Idempotent on idempotencyKey. Partner REQUIRED unless PLATFORM.
   */
  async postBookingPayment(
    input: PostBookingPaymentInput,
    outerTx?: Tx,
  ): Promise<{ alreadyExisted: boolean; transactionId: string }> {
    const payoutOwnerType = input.payoutOwnerType ?? "PARTNER";
    const partnerUserId = input.partnerUserId ?? null;
    if (payoutOwnerType === "PARTNER" && !partnerUserId) {
      throw new MissingPartnerError();
    }

    const run = async (tx: Tx) => {
      const existing = await ledgerRepository.findTransactionByIdempotencyKey(
        input.idempotencyKey,
        tx,
      );
      if (existing) {
        return { alreadyExisted: true, transactionId: existing.id };
      }

      if (input.grossTiyin <= 0n) {
        const created = await tx.ledgerTransaction.create({
          data: {
            bookingId: input.bookingId ?? null,
            type: LedgerTxType.BOOKING_PAYMENT,
            idempotencyKey: input.idempotencyKey,
          },
        });
        return { alreadyExisted: false, transactionId: created.id };
      }

      const clearing = await ledgerRepository.ensureAccount(
        { type: "ASSET", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );
      const revenue = await ledgerRepository.ensureAccount(
        { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );

      const lines: Array<{
        accountId: string;
        amount: bigint;
        direction: "DEBIT" | "CREDIT";
      }> = [
        { accountId: clearing.id, amount: input.grossTiyin, direction: "DEBIT" },
      ];

      if (payoutOwnerType === "PLATFORM") {
        lines.push({
          accountId: revenue.id,
          amount: input.grossTiyin,
          direction: "CREDIT",
        });
      } else {
        if (!partnerUserId) {
          throw new MissingPartnerError();
        }
        const ratePercent = input.ratePercent ?? 10;
        const { platformTotal, partnerNet } =
          ratePercent === 10
            ? splitBookingCommission(input.grossTiyin)
            : calcPlatformCommissionTiyin(input.grossTiyin, ratePercent);

        const payable = await ledgerRepository.ensureAccount(
          {
            type: "LIABILITY",
            ownerType: "PARTNER",
            ownerId: partnerUserId,
          },
          tx,
        );

        if (partnerNet > 0n) {
          lines.push({
            accountId: payable.id,
            amount: partnerNet,
            direction: "CREDIT",
          });
        }
        if (platformTotal > 0n) {
          lines.push({
            accountId: revenue.id,
            amount: platformTotal,
            direction: "CREDIT",
          });
        }
      }

      assertBalanced(lines);

      const created = await ledgerRepository.createTransactionWithEntries(
        {
          bookingId: input.bookingId,
          type: LedgerTxType.BOOKING_PAYMENT,
          idempotencyKey: input.idempotencyKey,
          entries: lines,
        },
        tx,
      );

      return { alreadyExisted: false, transactionId: created.id };
    };

    if (outerTx) return run(outerTx);

    const { db } = await import("@/src/modules/payment/repository/db");
    return db.$transaction(async (tx: Tx) => run(tx));
  }

  async record(
    input: PostBookingPaymentInput,
    outerTx?: Tx,
  ): Promise<{ alreadyExisted: boolean; transactionId: string }> {
    return this.postBookingPayment(input, outerTx);
  }

  /**
   * Compensating REFUND / PARTIAL_REFUND / CLAWBACK.
   * DEBIT Partner Payable (or UNATTRIBUTED) + Platform Revenue
   * CREDIT Platform Clearing
   */
  async postRefundCompensation(
    input: PostRefundInput,
    outerTx?: Tx,
  ): Promise<{ alreadyExisted: boolean; transactionId: string }> {
    const run = async (tx: Tx) => {
      const existing = await ledgerRepository.findTransactionByIdempotencyKey(
        input.idempotencyKey,
        tx,
      );
      if (existing) {
        return { alreadyExisted: true, transactionId: existing.id };
      }

      const txType =
        input.typeOverride ??
        (input.afterPayout
          ? LedgerTxType.CLAWBACK
          : input.refundPercent < 100
            ? LedgerTxType.PARTIAL_REFUND
            : LedgerTxType.REFUND);

      if (input.refundTiyin <= 0n) {
        const created = await tx.ledgerTransaction.create({
          data: {
            bookingId: input.bookingId ?? null,
            type: txType,
            idempotencyKey: input.idempotencyKey,
          },
        });
        return { alreadyExisted: false, transactionId: created.id };
      }

      const clearing = await ledgerRepository.ensureAccount(
        { type: "ASSET", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );
      const revenue = await ledgerRepository.ensureAccount(
        { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );

      const lines: Array<{
        accountId: string;
        amount: bigint;
        direction: "DEBIT" | "CREDIT";
      }> = [
        { accountId: clearing.id, amount: input.refundTiyin, direction: "CREDIT" },
      ];

      if (input.payoutOwnerType === "PLATFORM") {
        lines.push({
          accountId: revenue.id,
          amount: input.refundTiyin,
          direction: "DEBIT",
        });
      } else {
        const commissionRefund =
          (input.originalCommissionTiyin * BigInt(input.refundPercent)) / 100n;
        const partnerClawback = input.refundTiyin - commissionRefund;

        let partnerOwnerType = "PARTNER";
        let partnerOwnerId = input.partnerUserId ?? "";
        if (!input.partnerUserId) {
          if (!input.allowUnattributed) {
            throw new MissingPartnerError(
              "Partner required for refund ledger post (set allowUnattributed for UNATTRIBUTED)",
            );
          }
          partnerOwnerType = UNATTRIBUTED_OWNER.ownerType;
          partnerOwnerId = UNATTRIBUTED_OWNER.ownerId;
          console.error("ALERT ledger_refund_unattributed", {
            bookingId: input.bookingId,
            idempotencyKey: input.idempotencyKey,
            refundTiyin: input.refundTiyin.toString(),
          });
        }

        const payable = await ledgerRepository.ensureAccount(
          {
            type: "LIABILITY",
            ownerType: partnerOwnerType,
            ownerId: partnerOwnerId,
          },
          tx,
        );

        if (partnerClawback > 0n) {
          lines.push({
            accountId: payable.id,
            amount: partnerClawback,
            direction: "DEBIT",
          });
        }
        if (commissionRefund > 0n) {
          lines.push({
            accountId: revenue.id,
            amount: commissionRefund,
            direction: "DEBIT",
          });
        }
      }

      assertBalanced(lines);

      const created = await ledgerRepository.createTransactionWithEntries(
        {
          bookingId: input.bookingId,
          type: txType,
          idempotencyKey: input.idempotencyKey,
          entries: lines,
        },
        tx,
      );

      return { alreadyExisted: false, transactionId: created.id };
    };

    if (outerTx) return run(outerTx);

    const { db } = await import("@/src/modules/payment/repository/db");
    return db.$transaction(async (tx: Tx) => run(tx));
  }

  /** Stub PAYOUT poster (no UI yet) — DEBIT Partner Payable, CREDIT Platform Clearing. */
  async postPayout(
    input: {
      idempotencyKey: string;
      partnerUserId: string;
      amountTiyin: bigint;
      bookingId?: string | null;
    },
    outerTx?: Tx,
  ): Promise<{ alreadyExisted: boolean; transactionId: string }> {
    const run = async (tx: Tx) => {
      const existing = await ledgerRepository.findTransactionByIdempotencyKey(
        input.idempotencyKey,
        tx,
      );
      if (existing) {
        return { alreadyExisted: true, transactionId: existing.id };
      }
      if (input.amountTiyin <= 0n) {
        throw new Error("payout amount must be > 0");
      }
      const clearing = await ledgerRepository.ensureAccount(
        { type: "ASSET", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );
      const payable = await ledgerRepository.ensureAccount(
        {
          type: "LIABILITY",
          ownerType: "PARTNER",
          ownerId: input.partnerUserId,
        },
        tx,
      );
      const lines = [
        {
          accountId: payable.id,
          amount: input.amountTiyin,
          direction: "DEBIT" as const,
        },
        {
          accountId: clearing.id,
          amount: input.amountTiyin,
          direction: "CREDIT" as const,
        },
      ];
      assertBalanced(lines);
      const created = await ledgerRepository.createTransactionWithEntries(
        {
          bookingId: input.bookingId,
          type: LedgerTxType.PAYOUT,
          idempotencyKey: input.idempotencyKey,
          entries: lines,
        },
        tx,
      );
      return { alreadyExisted: false, transactionId: created.id };
    };
    if (outerTx) return run(outerTx);
    const { db } = await import("@/src/modules/payment/repository/db");
    return db.$transaction(async (tx: Tx) => run(tx));
  }

  /** CHARGEBACK: same economics as full refund; distinct ledger type. */
  async postChargeback(
    input: {
      idempotencyKey: string;
      bookingId?: string | null;
      amountTiyin: bigint;
      originalCommissionTiyin: bigint;
      partnerUserId: string;
    },
    outerTx?: Tx,
  ): Promise<{ alreadyExisted: boolean; transactionId: string }> {
    return this.postRefundCompensation(
      {
        idempotencyKey: input.idempotencyKey,
        bookingId: input.bookingId,
        refundTiyin: input.amountTiyin,
        refundPercent: 100,
        originalCommissionTiyin: input.originalCommissionTiyin,
        partnerUserId: input.partnerUserId,
        typeOverride: LedgerTxType.CHARGEBACK,
      },
      outerTx,
    );
  }

  async getPartnerPayableTiyin(partnerUserId: string): Promise<bigint> {
    return ledgerRepository.getPartnerPayableTiyin(partnerUserId);
  }

  async sumPlatformRevenueTiyin(opts?: {
    from?: Date;
    to?: Date;
  }): Promise<bigint> {
    return ledgerRepository.sumPlatformRevenueTiyin(opts ?? {});
  }
}

export const ledgerService = new LedgerService();
