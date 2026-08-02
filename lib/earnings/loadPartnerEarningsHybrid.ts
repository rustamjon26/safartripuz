import type { PartnerEarningType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ledgerService } from "@/src/modules/ledger";
import { Money } from "@/src/shared/money";

export type PartnerEarningsHybridSummary = {
  /** Ledger balance aggregates (general ledger). */
  source: "ledger";
  payableTiyin: string;
  payableSom: number;
  totalNet: number;
  pendingNet: number;
  totalCommission: number;
  /** Dual-write PE rows still PENDING (subledger count, not balance SoT). */
  pendingCount: number;
};

export type PartnerEarningsHybridResponse = {
  earnings: Array<{
    id: string;
    partnerId: string;
    bookingType: PartnerEarningType;
    bookingId: string;
    grossAmount: unknown;
    commissionRate: unknown;
    commissionFee: unknown;
    netAmount: unknown;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  summary: PartnerEarningsHybridSummary;
};

/**
 * Hybrid read: Ledger for balance aggregates; PartnerEarning for line items.
 * PLATFORM-owned bookings never create PE / partner payable → zeros + empty lines.
 */
export async function loadPartnerEarningsHybrid(opts: {
  partnerUserId: string;
  bookingType: Exclude<PartnerEarningType, "TAXI">;
  lineItemLimit?: number;
}): Promise<PartnerEarningsHybridResponse> {
  const limit = opts.lineItemLimit ?? 50;

  const [balances, earnings] = await Promise.all([
    ledgerService.getPartnerBalanceSummary(opts.partnerUserId),
    prisma.partnerEarning.findMany({
      where: {
        partnerId: opts.partnerUserId,
        bookingType: opts.bookingType,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const payableSom = Money.fromTiyin(balances.pendingNetTiyin).toSomNumber();
  const totalCommission = Money.fromTiyin(
    balances.attributedCommissionTiyin,
  ).toSomNumber();

  return {
    earnings,
    summary: {
      source: "ledger",
      payableTiyin: balances.payableTiyin.toString(),
      payableSom,
      totalNet: payableSom,
      pendingNet: payableSom,
      totalCommission,
      pendingCount: earnings.filter((e) => e.status === "PENDING").length,
    },
  };
}
