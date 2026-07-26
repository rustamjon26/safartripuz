import { assertBalanced } from "../domain/balance";
import { splitBookingCommission } from "../domain/commission";
import { ledgerRepository, type Tx } from "../repository/ledger.repository";

export type PostBookingPaymentInput = {
  idempotencyKey: string;
  bookingId?: string | null;
  grossTiyin: bigint;
  partnerUserId?: string | null;
};

export class LedgerService {
  /**
   * Post a balanced booking payment:
   * DEBIT Platform Clearing (gross)
   * CREDIT Partner Payable (net) + Platform Revenue (commission)
   * Idempotent on idempotencyKey.
   */
  async postBookingPayment(
    input: PostBookingPaymentInput,
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

      if (input.grossTiyin <= 0n) {
        const clearing = await ledgerRepository.ensureAccount(
          { type: "ASSET", ownerType: "PLATFORM", ownerId: "" },
          tx,
        );
        const revenue = await ledgerRepository.ensureAccount(
          { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
          tx,
        );
        // Marker tx with balanced 0-avoid: skip entries — use minimal balanced stub not allowed.
        // Store empty-balanced by skipping create of money lines: use type NOTE with 0 via no entries.
        const created = await tx.ledgerTransaction.create({
          data: {
            bookingId: input.bookingId ?? null,
            type: "BOOKING_PAYMENT",
            idempotencyKey: input.idempotencyKey,
          },
        });
        void clearing;
        void revenue;
        return { alreadyExisted: false, transactionId: created.id };
      }

      const { platformTotal, partnerNet } = splitBookingCommission(input.grossTiyin);

      const clearing = await ledgerRepository.ensureAccount(
        { type: "ASSET", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );
      const revenue = await ledgerRepository.ensureAccount(
        { type: "REVENUE", ownerType: "PLATFORM", ownerId: "" },
        tx,
      );

      const lines: Array<{ accountId: string; amount: bigint; direction: "DEBIT" | "CREDIT" }> = [
        { accountId: clearing.id, amount: input.grossTiyin, direction: "DEBIT" },
      ];

      if (input.partnerUserId && partnerNet > 0n) {
        const payable = await ledgerRepository.ensureAccount(
          { type: "LIABILITY", ownerType: "PARTNER", ownerId: input.partnerUserId },
          tx,
        );
        lines.push({ accountId: payable.id, amount: partnerNet, direction: "CREDIT" });
        if (platformTotal > 0n) {
          lines.push({ accountId: revenue.id, amount: platformTotal, direction: "CREDIT" });
        }
      } else {
        lines.push({
          accountId: revenue.id,
          amount: input.grossTiyin,
          direction: "CREDIT",
        });
      }

      assertBalanced(lines);

      const created = await ledgerRepository.createTransactionWithEntries(
        {
          bookingId: input.bookingId,
          type: "BOOKING_PAYMENT",
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
   * Compensating REFUND + proportional commission reverse.
   * DEBIT Partner Payable (partner clawback) + Platform Revenue (commission reverse)
   * CREDIT Platform Clearing (refundTiyin)
   * Partner balance may go negative after PAYOUT (clawback still posts).
   */
  async postRefundCompensation(
    input: {
      idempotencyKey: string;
      bookingId?: string | null;
      refundTiyin: bigint;
      refundPercent: number;
      /** Original platform commission on the booking payment (tiyin). */
      originalCommissionTiyin: bigint;
      partnerUserId?: string | null;
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

      if (input.refundTiyin <= 0n) {
        const created = await tx.ledgerTransaction.create({
          data: {
            bookingId: input.bookingId ?? null,
            type: "REFUND",
            idempotencyKey: input.idempotencyKey,
          },
        });
        return { alreadyExisted: false, transactionId: created.id };
      }

      const commissionRefund =
        (input.originalCommissionTiyin * BigInt(input.refundPercent)) / 100n;
      const partnerClawback = input.refundTiyin - commissionRefund;

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
      }> = [{ accountId: clearing.id, amount: input.refundTiyin, direction: "CREDIT" }];

      if (input.partnerUserId && partnerClawback > 0n) {
        const payable = await ledgerRepository.ensureAccount(
          { type: "LIABILITY", ownerType: "PARTNER", ownerId: input.partnerUserId },
          tx,
        );
        lines.push({
          accountId: payable.id,
          amount: partnerClawback,
          direction: "DEBIT",
        });
        if (commissionRefund > 0n) {
          lines.push({
            accountId: revenue.id,
            amount: commissionRefund,
            direction: "DEBIT",
          });
        }
      } else {
        lines.push({
          accountId: revenue.id,
          amount: input.refundTiyin,
          direction: "DEBIT",
        });
      }

      assertBalanced(lines);

      const created = await ledgerRepository.createTransactionWithEntries(
        {
          bookingId: input.bookingId,
          type: "REFUND",
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
}

export const ledgerService = new LedgerService();
