import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { ledgerPlatformFeesToBuckets } from "@/lib/admin/revenuePlatformFees";
import { travelPlanPrimaryRevenueCategory, type RevenueCategory } from "@/lib/payments/travelPlanBookingTypes";
import { getCommissionRates } from "@/lib/getCommissionRates";
import { prisma } from "@/lib/prisma";
import { ledgerService } from "@/src/modules/ledger";
import { Money } from "@/src/shared/money";

function parseDay(value: string | null, endOfDay: boolean) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function somDecimalToNumber(value: { toString(): string }): number {
  return Money.fromSomNumber(value.toString()).toSomNumber();
}

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const start = parseDay(searchParams.get("startDate"), false);
    const end = parseDay(searchParams.get("endDate"), true);
    if (!start || !end || end < start) {
      return NextResponse.json({ message: "startDate va endDate kerak (YYYY-MM-DD)" }, { status: 400 });
    }

    const [payments, rates, platformRevenueTiyin, ledgerFeesByType, peGroups] =
      await Promise.all([
        prisma.payment.findMany({
          where: {
            status: "SUCCESS",
            OR: [
              { paidAt: { gte: start, lte: end } },
              { paidAt: null, createdAt: { gte: start, lte: end } },
            ],
          },
          select: {
            id: true,
            amount: true,
            travelPlan: {
              select: {
                items: { select: { type: true } },
                _count: {
                  select: {
                    homeStayBookings: true,
                    guideBookings: true,
                    taxiOrders: true,
                  },
                },
              },
            },
          },
        }),
        getCommissionRates(),
        ledgerService.sumPlatformRevenueTiyin({ from: start, to: end }),
        ledgerService.sumPlatformRevenueByBookingTypeTiyin({
          from: start,
          to: end,
        }),
        // Partner-side subledger breakdown (PARTNER bookings only).
        prisma.partnerEarning.groupBy({
          by: ["bookingType"],
          where: {
            createdAt: { gte: start, lte: end },
            status: { not: "CANCELLED" },
            bookingType: { not: "TAXI" },
          },
          _count: { _all: true },
          _sum: {
            grossAmount: true,
            commissionFee: true,
            netAmount: true,
          },
        }),
      ]);

    const buckets: Record<
      RevenueCategory,
      { count: number; total: number; platformFee: number }
    > = {
      HOTEL: { count: 0, total: 0, platformFee: 0 },
      HOMESTAY: { count: 0, total: 0, platformFee: 0 },
      TAXI: { count: 0, total: 0, platformFee: 0 },
      GUIDE: { count: 0, total: 0, platformFee: 0 },
      OTHER: { count: 0, total: 0, platformFee: 0 },
    };

    for (const p of payments) {
      const plan = p.travelPlan;
      if (!plan) {
        buckets.OTHER.count += 1;
        buckets.OTHER.total += Money.fromSomNumber(p.amount.toString()).toSomNumber();
        continue;
      }
      const cat = travelPlanPrimaryRevenueCategory(plan);
      const amt = Money.fromSomNumber(p.amount.toString()).toSomNumber();
      buckets[cat].count += 1;
      buckets[cat].total += amt;
    }

    // Per-type platform fee from Ledger (includes PLATFORM-owned bookings).
    const ledgerFees = ledgerPlatformFeesToBuckets(ledgerFeesByType);
    for (const type of ["HOTEL", "HOMESTAY", "GUIDE", "TAXI"] as const) {
      buckets[type].platformFee = ledgerFees[type];
    }

    const commissionSummary = peGroups.map((g) => ({
      type: g.bookingType,
      count: g._count._all,
      totalGross: somDecimalToNumber(g._sum.grossAmount ?? { toString: () => "0" }),
      totalCommission: somDecimalToNumber(
        g._sum.commissionFee ?? { toString: () => "0" },
      ),
      totalNet: somDecimalToNumber(g._sum.netAmount ?? { toString: () => "0" }),
    }));

    const totalPlatformCommission = Money.fromTiyin(
      platformRevenueTiyin < 0n ? 0n : platformRevenueTiyin,
    ).toSomNumber();

    const breakdown = (["HOTEL", "HOMESTAY", "TAXI", "GUIDE", "OTHER"] as const).map((type) => ({
      type,
      count: buckets[type].count,
      total: buckets[type].total,
      /** Ledger platform REVENUE by bookingType (PARTNER + PLATFORM). */
      platformFee: buckets[type].platformFee,
    }));

    const grandTotal = breakdown.reduce((s, b) => s + b.total, 0);

    return NextResponse.json(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        /**
         * Hybrid: Ledger for total + per-type platformFee;
         * PartnerEarning commissionSummary for partner-side detail.
         */
        source: "ledger+partner_earning",
        breakdown,
        grandTotal,
        totalPlatformFee: totalPlatformCommission,
        totalPlatformCommission,
        platformRevenueTiyin: platformRevenueTiyin.toString(),
        commissionSummary,
        commissionRates: rates,
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
