import type { PartnerEarningType, Prisma } from "@prisma/client";
import {
  calcPlatformCommissionTiyin,
  ledgerService,
} from "@/src/modules/ledger";
import { bookingService } from "./booking.service";
import type { RefundBreakdown } from "../domain/refund";

type Tx = Prisma.TransactionClient;

/**
 * Post refund ledger + reverse PartnerEarning inside an existing transaction.
 * Provider HTTP refund stays outside the caller.
 */
export async function postCancelAccountingInTx(
  tx: Tx,
  opts: {
    bookingType: PartnerEarningType;
    bookingId: string;
    partnerUserId: string | null;
    refund: RefundBreakdown;
    ratePercent: number;
  },
): Promise<void> {
  if (opts.refund.refundTiyin <= 0n) return;

  const grossPaidApprox =
    opts.refund.refundPercent > 0
      ? (opts.refund.refundTiyin * 100n) / BigInt(opts.refund.refundPercent)
      : opts.refund.refundTiyin + opts.refund.retainedTiyin;

  const { platformTotal } = calcPlatformCommissionTiyin(
    grossPaidApprox,
    opts.ratePercent,
  );

  await ledgerService.postRefundCompensation(
    {
      idempotencyKey: `refund:${opts.bookingType}:${opts.bookingId}:${opts.refund.refundPercent}`,
      bookingId: opts.bookingId,
      refundTiyin: opts.refund.refundTiyin,
      refundPercent: opts.refund.refundPercent,
      originalCommissionTiyin: platformTotal,
      partnerUserId: opts.partnerUserId,
      allowUnattributed: !opts.partnerUserId,
    },
    tx,
  );

  await bookingService.reversePartnerEarning(
    tx,
    opts.bookingType,
    opts.bookingId,
    opts.refund.refundPercent,
  );
}
