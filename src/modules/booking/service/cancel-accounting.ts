import type { PartnerEarningType, Prisma } from "@prisma/client";
import {
  calcPlatformCommissionTiyin,
  ledgerService,
} from "@/src/modules/ledger";
import { reversePartnerEarningInTx } from "./partner-earning";
import type { RefundBreakdown } from "../domain/refund";

type Tx = Prisma.TransactionClient;

type CancelEarningType = Exclude<PartnerEarningType, "TAXI">;

/**
 * Post refund ledger + reverse PartnerEarning inside an existing transaction.
 * Both writes share `tx` — caller must commit/rollback atomically.
 * Provider HTTP refund stays outside the caller.
 *
 * Fail-loud: no swallowed errors. Missing partner on a paid refund throws.
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

  const grossPaidApprox =
    opts.refund.refundPercent > 0
      ? (opts.refund.refundTiyin * 100n) / BigInt(opts.refund.refundPercent)
      : opts.refund.refundTiyin + opts.refund.retainedTiyin;

  const { platformTotal } = calcPlatformCommissionTiyin(
    grossPaidApprox,
    opts.ratePercent,
  );

  try {
    await ledgerService.postRefundCompensation(
      {
        idempotencyKey: `refund:${opts.bookingType}:${opts.bookingId}:${opts.refund.refundPercent}`,
        bookingId: opts.bookingId,
        refundTiyin: opts.refund.refundTiyin,
        refundPercent: opts.refund.refundPercent,
        originalCommissionTiyin:
          payoutOwnerType === "PLATFORM" ? opts.refund.refundTiyin : platformTotal,
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
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
