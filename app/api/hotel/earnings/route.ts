import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET() {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const hotelRow = await prisma.hotel.findUnique({
      where: { id: ctx.hotel.id },
      select: { partner: { select: { userId: true } } },
    });
    const ownerUserId = hotelRow?.partner?.userId;
    if (!ownerUserId) {
      return NextResponse.json({ message: "Partner not found" }, { status: 404 });
    }

    const earnings = await prisma.partnerEarning.findMany({
      where: {
        partnerId: ownerUserId,
        bookingType: "HOTEL",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const summary = {
      totalGross: earnings.reduce((s, e) => s + Number(e.grossAmount), 0),
      totalCommission: earnings.reduce((s, e) => s + Number(e.commissionFee), 0),
      totalNet: earnings.reduce((s, e) => s + Number(e.netAmount), 0),
      pendingNet: earnings
        .filter((e) => e.status === "PENDING")
        .reduce((s, e) => s + Number(e.netAmount), 0),
    };

    return NextResponse.json({ earnings, summary });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
