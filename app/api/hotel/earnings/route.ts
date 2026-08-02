import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { loadPartnerEarningsHybrid } from "@/lib/earnings/loadPartnerEarningsHybrid";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { prisma } from "@/lib/prisma";

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

    // Ledger = balances; PartnerEarning = line items (subledger).
    const payload = await loadPartnerEarningsHybrid({
      partnerUserId: ownerUserId,
      bookingType: "HOTEL",
    });

    return NextResponse.json(payload);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
