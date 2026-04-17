import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../_utils";

export async function GET(req: Request) {
  try {
    await requireTaxiAdmin();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
      where: { role: "taxi_partner" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        driverProfile: true,
        taxiVehicles: { where: { isActive: true }, select: { id: true } },
      },
      }),
      prisma.user.count({ where: { role: "taxi_partner" } }),
    ]);

    const driverIds = users.map((u) => u.id);
    const monthlyEarnings = await prisma.driverEarning.groupBy({
      by: ["driverId"],
      where: {
        driverId: { in: driverIds },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { netAmount: true },
    });

    const earningsMap = new Map(monthlyEarnings.map((e) => [e.driverId, Number(e._sum.netAmount ?? 0)]));

    const data = users.map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      isBlocked: user.isBlocked,
      vehicleCount: user.taxiVehicles.length,
      totalTrips: user.driverProfile?.totalTrips ?? 0,
      rating: user.driverProfile?.rating ?? null,
      isOnline: user.driverProfile?.isOnline ?? false,
      earningsThisMonth: earningsMap.get(user.id) ?? 0,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
