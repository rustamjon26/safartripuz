import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGuideAdmin, unauthorizedResponse } from "../_utils";

export async function GET(req: Request) {
  try {
    await requireGuideAdmin();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "guide" },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          guideListings: {
            select: {
              id: true,
              totalBookings: true,
              rating: true,
            },
          },
          partnerProfile: {
            select: { type: true, status: true },
          },
        },
      }),
      prisma.user.count({ where: { role: "guide" } }),
    ]);

    const guideIds = users.map((u) => u.id);
    const monthlyRevenue = await prisma.guideBooking.groupBy({
      by: ["guideId"],
      where: {
        guideId: { in: guideIds },
        status: "COMPLETED",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { totalPrice: true },
    });
    const revenueMap = new Map(monthlyRevenue.map((r) => [r.guideId, Number(r._sum.totalPrice ?? 0)]));

    const data = users.map((user) => {
      const listingCount = user.guideListings.length;
      const totalBookings = user.guideListings.reduce((sum, l) => sum + l.totalBookings, 0);
      const avgRating =
        listingCount === 0
          ? null
          : user.guideListings.reduce((sum, l) => sum + l.rating, 0) / listingCount;

      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        isBlocked: user.isBlocked,
        role: user.role === "guide" ? "guide_partner" : user.role,
        listingCount,
        totalBookings,
        avgRating,
        revenueThisMonth: revenueMap.get(user.id) ?? 0,
        createdAt: user.createdAt,
      };
    });

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
