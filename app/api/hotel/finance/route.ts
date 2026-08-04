import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { loadHotelFinancePage } from "@/lib/hotel/getHotelFinanceAnalytics";

export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireRole([
      "hotel_manager",
      "admin",
      "super_admin",
      "receptionist",
    ]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) {
      return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
    }

    const { bookings, analytics } = await loadHotelFinancePage(ctx.hotel.id);
    return NextResponse.json({ bookings, analytics }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    console.error("[hotel/finance GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
