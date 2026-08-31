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

/**
 * Line item shape. Tiyin values are the source of truth but travel as strings —
 * BigInt has no JSON representation. The `*Som` numbers are display-only.
 */
export type PartnerEarningLineItem = {
  id: string;
  partnerId: string;
  bookingType: PartnerEarningType;
  bookingId: string;
  grossTiyin: string;
  commissionFeeTiyin: string;
  netTiyin: string;
  grossSom: number;
  commissionFeeSom: number;
  netSom: number;
  commissionRate: number;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnerEarningsHybridResponse = {
  earnings: PartnerEarningLineItem[];
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
    earnings: earnings.map((e) => ({
      id: e.id,
      partnerId: e.partnerId,
      bookingType: e.bookingType,
      bookingId: e.bookingId,
      grossTiyin: e.grossTiyin.toString(),
      commissionFeeTiyin: e.commissionFeeTiyin.toString(),
      netTiyin: e.netTiyin.toString(),
      grossSom: Money.fromTiyin(e.grossTiyin).toSomNumber(),
      commissionFeeSom: Money.fromTiyin(e.commissionFeeTiyin).toSomNumber(),
      netSom: Money.fromTiyin(e.netTiyin).toSomNumber(),
      commissionRate: e.commissionRate,
      status: e.status,
      paidAt: e.paidAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
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
