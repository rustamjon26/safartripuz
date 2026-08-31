import { calcPlatformCommissionTiyin } from "@/src/modules/commission";
import type { RefundBreakdown } from "./refund";

export class CancelAccountingDriftError extends Error {
  readonly code = "CANCEL_ACCOUNTING_DRIFT" as const;
  constructor(message: string) {
    super(message);
    this.name = "CancelAccountingDriftError";
  }
}

/** What the original BOOKING_PAYMENT actually posted, when the ledger has it. */
export type PostedCharge = {
  grossTiyin: bigint;
  commissionTiyin: bigint;
};

export type ResolvedCancelAmounts = {
  originalGrossTiyin: bigint;
  originalCommissionTiyin: bigint;
  /** `ledger` = read back from the original posting; `rate` = recomputed. */
  source: "ledger" | "rate";
};

/**
 * The exact gross that was charged.
 *
 * `computeRefund` always splits the gross as `retained = gross - refund`, so the
 * two parts add back to it with no rounding involved. Recovering it by inverting
 * the refund percentage instead (`refund * 100 / percent`) loses up to
 * `100 / percent - 1` tiyin, because the forward direction floored.
 */
export function originalGrossFromRefund(refund: RefundBreakdown): bigint {
  return refund.refundTiyin + refund.retainedTiyin;
}

/**
 * Original gross + commission for a cancellation.
 *
 * Prefers what the ledger actually posted at payment time: that survives a
 * commission-rate change between booking and cancellation, which recomputation
 * would silently get wrong. Falls back to recomputing from the *exact* gross
 * (never an inverted percentage) for bookings with no ledger history.
 */
export function resolveCancelAmounts(input: {
  refund: RefundBreakdown;
  ratePercent: number;
  posted?: PostedCharge | null;
}): ResolvedCancelAmounts {
  const originalGrossTiyin = originalGrossFromRefund(input.refund);

  if (input.posted && input.posted.grossTiyin > 0n) {
    return {
      originalGrossTiyin: input.posted.grossTiyin,
      originalCommissionTiyin: input.posted.commissionTiyin,
      source: "ledger",
    };
  }

  const { platformTotal } = calcPlatformCommissionTiyin(
    originalGrossTiyin,
    input.ratePercent,
  );
  return {
    originalGrossTiyin,
    originalCommissionTiyin: platformTotal,
    source: "rate",
  };
}

/**
 * Mirror of the split `postRefundCompensation` writes, so the caller can check
 * it before posting: revenue clawback is proportional to the original
 * commission, and the partner leg absorbs the remainder.
 */
export function refundSplitTiyin(input: {
  refundTiyin: bigint;
  refundPercent: number;
  originalCommissionTiyin: bigint;
}): { commissionRefundTiyin: bigint; partnerClawbackTiyin: bigint } {
  const commissionRefundTiyin =
    (input.originalCommissionTiyin * BigInt(input.refundPercent)) / 100n;
  return {
    commissionRefundTiyin,
    partnerClawbackTiyin: input.refundTiyin - commissionRefundTiyin,
  };
}

/**
 * Guards the reversal against drift, in tiyin only.
 *
 * 1. the refund/retained split must add back to the original gross
 * 2. commission cannot exceed the gross it came from
 * 3. the posted legs must add back to the refunded amount
 * 4. a full refund must reverse the original charge exactly
 */
export function assertCancelAmountsBalance(input: {
  refund: RefundBreakdown;
  originalGrossTiyin: bigint;
  originalCommissionTiyin: bigint;
  context?: Record<string, string>;
}): void {
  const { refund, originalGrossTiyin, originalCommissionTiyin } = input;
  const where = input.context ? ` ${JSON.stringify(input.context)}` : "";

  const split = refund.refundTiyin + refund.retainedTiyin;
  if (split !== originalGrossTiyin) {
    throw new CancelAccountingDriftError(
      `refund ${refund.refundTiyin} + retained ${refund.retainedTiyin} != gross ${originalGrossTiyin}${where}`,
    );
  }

  if (originalCommissionTiyin < 0n || originalCommissionTiyin > originalGrossTiyin) {
    throw new CancelAccountingDriftError(
      `commission ${originalCommissionTiyin} out of range for gross ${originalGrossTiyin}${where}`,
    );
  }

  const { commissionRefundTiyin, partnerClawbackTiyin } = refundSplitTiyin({
    refundTiyin: refund.refundTiyin,
    refundPercent: refund.refundPercent,
    originalCommissionTiyin,
  });

  if (commissionRefundTiyin + partnerClawbackTiyin !== refund.refundTiyin) {
    throw new CancelAccountingDriftError(
      `commission ${commissionRefundTiyin} + partner ${partnerClawbackTiyin} != refund ${refund.refundTiyin}${where}`,
    );
  }

  if (refund.refundPercent === 100) {
    if (refund.refundTiyin !== originalGrossTiyin) {
      throw new CancelAccountingDriftError(
        `100% refund ${refund.refundTiyin} != gross ${originalGrossTiyin}${where}`,
      );
    }
    if (commissionRefundTiyin !== originalCommissionTiyin) {
      throw new CancelAccountingDriftError(
        `100% refund claws back ${commissionRefundTiyin} of ${originalCommissionTiyin} commission${where}`,
      );
    }
  }
}
