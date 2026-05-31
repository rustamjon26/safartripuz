import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { travelPlanPrimaryRevenueCategory, type RevenueCategory } from "@/lib/payments/travelPlanBookingTypes";
import { getCommissionRates } from "@/lib/getCommissionRates";

function parseDay(value: string | null, endOfDay: boolean) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
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

    const [payments, earningsStats, rates] = await Promise.all([
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
      prisma.partnerEarning.groupBy({
        by: ["bookingType"],
        where: { createdAt: { gte: start, lte: end } },
        _sum: {
          grossAmount: true,
          commissionFee: true,
          netAmount: true,
        },
        _count: { id: true },
      }),
      getCommissionRates(),
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
        buckets.OTHER.total += Number(p.amount);
        continue;
      }
      const cat = travelPlanPrimaryRevenueCategory(plan);
      const amt = Number(p.amount);
      buckets[cat].count += 1;
      buckets[cat].total += amt;
    }

    const earningTypeToCategory: Record<string, RevenueCategory> = {
      HOTEL: "HOTEL",
      HOMESTAY: "HOMESTAY",
      GUIDE: "GUIDE",
      TAXI: "TAXI",
    };

    for (const row of earningsStats) {
      const cat = earningTypeToCategory[row.bookingType];
      if (!cat) continue;
      buckets[cat].platformFee += Number(row._sum.commissionFee ?? 0);
    }

    const breakdown = (["HOTEL", "HOMESTAY", "TAXI", "GUIDE", "OTHER"] as const).map((type) => ({
      type,
      count: buckets[type].count,
      total: buckets[type].total,
      platformFee: buckets[type].platformFee,
    }));

    const commissionSummary = earningsStats.map((e) => ({
      type: e.bookingType,
      totalGross: Number(e._sum.grossAmount ?? 0),
      totalCommission: Number(e._sum.commissionFee ?? 0),
      totalNet: Number(e._sum.netAmount ?? 0),
      count: e._count.id,
    }));

    const grandTotal = breakdown.reduce((s, b) => s + b.total, 0);
    const totalPlatformCommission = commissionSummary.reduce(
      (sum, e) => sum + e.totalCommission,
      0,
    );

    return NextResponse.json(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        breakdown,
        grandTotal,
        totalPlatformFee: totalPlatformCommission,
        totalPlatformCommission,
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
