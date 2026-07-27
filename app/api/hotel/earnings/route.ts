import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { prisma } from "@/lib/prisma";
import { ledgerService } from "@/src/modules/ledger";
import { Money } from "@/src/shared/money";

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

    // Ledger is source of truth for balances; PartnerEarning kept as dual-write history.
    const payableTiyin = await ledgerService.getPartnerPayableTiyin(ownerUserId);
    const earnings = await prisma.partnerEarning.findMany({
      where: {
        partnerId: ownerUserId,
        bookingType: "HOTEL",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const summary = {
      source: "ledger" as const,
      payableTiyin: payableTiyin.toString(),
      payableSom: Money.fromTiyin(payableTiyin < 0n ? 0n : payableTiyin).toSomNumber(),
      totalNet: Money.fromTiyin(payableTiyin < 0n ? 0n : payableTiyin).toSomNumber(),
      // Dual-write PE still listed for line items (not SoT for totals).
      pendingCount: earnings.filter((e) => e.status === "PENDING").length,
    };

    return NextResponse.json({ earnings, summary });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
