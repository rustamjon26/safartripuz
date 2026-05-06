import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

/** Aggregated counts for admin sidebar badges and notification dots (single round-trip). */
export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [
      partnerPendingCount,
      taxiDisputeCount,
      guideDisputeCount,
      guidePendingListingCount,
      homestayPendingListingCount,
      unverifiedDriverCount,
      taxiOrdersTodayCount,
      onlineDriverCount,
      guideBookingsThisMonthCount,
      guideActiveListingCount,
    ] = await Promise.all([
      prisma.partner.count({ where: { status: "pending" } }),
      prisma.taxiOrder.count({ where: { status: "DISPUTE" } }),
      prisma.guideBooking.count({ where: { status: "DISPUTE" } }),
      prisma.guideListing.count({ where: { status: "PENDING" } }),
      prisma.homeStayListing.count({ where: { status: "PENDING" } }),
      prisma.user.count({
        where: {
          role: "taxi_partner",
          OR: [{ driverProfile: null }, { driverProfile: { isVerified: false } }],
        },
      }),
      prisma.taxiOrder.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.driverProfile.count({ where: { isOnline: true } }),
      prisma.guideBooking.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.guideListing.count({ where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json(
      {
        partnerPendingCount,
        taxiDisputeCount,
        guideDisputeCount,
        guidePendingListingCount,
        homestayPendingListingCount,
        unverifiedDriverCount,
        taxiOrdersTodayCount,
        onlineDriverCount,
        guideBookingsThisMonthCount,
        guideActiveListingCount,
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
