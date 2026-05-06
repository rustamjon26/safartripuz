import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuideAdmin, unauthorizedResponse } from "../_utils";

/** Dashboard KPIs for admin guide overview */
export async function GET() {
  try {
    await requireGuideAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [activeListings, pendingListings, bookingsThisMonth, revenueAgg] = await Promise.all([
      prisma.guideListing.count({ where: { status: "ACTIVE" } }),
      prisma.guideListing.count({ where: { status: "PENDING" } }),
      prisma.guideBooking.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.guideBooking.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    return NextResponse.json(
      {
        activeListings,
        pendingListings,
        bookingsThisMonth,
        revenueThisMonth: Number(revenueAgg._sum.totalPrice ?? 0),
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
