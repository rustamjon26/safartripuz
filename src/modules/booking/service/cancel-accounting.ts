import type { PartnerEarningType, Prisma } from "@prisma/client";
import { ledgerRepository, ledgerService } from "@/src/modules/ledger";
import { reversePartnerEarningInTx } from "./partner-earning";
import {
  assertCancelAmountsBalance,
  resolveCancelAmounts,
} from "../domain/cancel-amounts";
import type { RefundBreakdown } from "../domain/refund";

type Tx = Prisma.TransactionClient;

type CancelEarningType = Exclude<PartnerEarningType, "TAXI">;

/**
 * Post refund ledger + reverse PartnerEarning inside an existing transaction.
 * Both writes share `tx` — caller must commit/rollback atomically.
 * Provider HTTP refund stays outside the caller.
 *
 * Fail-loud: no swallowed errors. Missing partner on a paid refund throws, and
 * so does any tiyin drift between the reversal and the original charge.
 */
export async function postCancelAccountingInTx(
  tx: Tx,
  opts: {
    bookingType: CancelEarningType;
    bookingId: string;
    partnerUserId: string | null;
    refund: RefundBreakdown;
    ratePercent: number;
    /** When PLATFORM, no PartnerEarning reverse; ledger claws back from revenue. */
    payoutOwnerType?: "PLATFORM" | "PARTNER";
  },
): Promise<void> {
  if (opts.refund.refundTiyin <= 0n) return;

  const payoutOwnerType = opts.payoutOwnerType ?? "PARTNER";

  // Read back what the payment actually posted rather than reconstructing it.
  const posted = await ledgerRepository.findBookingPaymentCharge(
    opts.bookingId,
    tx,
  );

  const { originalGrossTiyin, originalCommissionTiyin, source } =
    resolveCancelAmounts({
      refund: opts.refund,
      ratePercent: opts.ratePercent,
      posted,
    });

  // A booking whose ledger gross disagrees with the refund split is already
  // inconsistent; surface it rather than quietly reversing the wrong number.
  const splitGross = opts.refund.refundTiyin + opts.refund.retainedTiyin;
  if (source === "ledger" && originalGrossTiyin !== splitGross) {
    console.error("ALERT cancel_accounting_gross_drift", {
      bookingType: opts.bookingType,
      bookingId: opts.bookingId,
      ledgerGrossTiyin: originalGrossTiyin.toString(),
      refundSplitGrossTiyin: splitGross.toString(),
    });
  }

  assertCancelAmountsBalance({
    refund: opts.refund,
    originalGrossTiyin: source === "ledger" ? splitGross : originalGrossTiyin,
    originalCommissionTiyin,
    context: { bookingType: opts.bookingType, bookingId: opts.bookingId },
  });

  try {
    await ledgerService.postRefundCompensation(
      {
        idempotencyKey: `refund:${opts.bookingType}:${opts.bookingId}:${opts.refund.refundPercent}`,
        bookingId: opts.bookingId,
        bookingType: opts.bookingType,
        refundTiyin: opts.refund.refundTiyin,
        refundPercent: opts.refund.refundPercent,
        originalCommissionTiyin:
          payoutOwnerType === "PLATFORM"
            ? opts.refund.refundTiyin
            : originalCommissionTiyin,
        partnerUserId: opts.partnerUserId,
        allowUnattributed: false,
        payoutOwnerType,
      },
      tx,
    );

    if (payoutOwnerType !== "PLATFORM") {
      await reversePartnerEarningInTx(
        tx,
        opts.bookingType,
        opts.bookingId,
        opts.refund.refundPercent,
      );
    }
  } catch (err) {
    console.error("ALERT cancel_accounting_failed", {
      bookingType: opts.bookingType,
      bookingId: opts.bookingId,
      partnerUserId: opts.partnerUserId,
      refundTiyin: opts.refund.refundTiyin.toString(),
      refundPercent: opts.refund.refundPercent,
      ratePercent: opts.ratePercent,
      originalGrossTiyin: originalGrossTiyin.toString(),
      originalCommissionTiyin: originalCommissionTiyin.toString(),
      commissionSource: source,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
