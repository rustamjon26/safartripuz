import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { assertHotelAccess } from "@/lib/hotel/assertHotelAccess";
import {
  getHotelDashboardStats,
  parseStatsDateParam,
} from "@/lib/hotel/getHotelDashboardStats";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const dateParam = new URL(req.url).searchParams.get("date");
    let statsDay: Date;
    try {
      statsDay = parseStatsDateParam(dateParam);
    } catch {
      return NextResponse.json(
        { success: false, error: "date parametri YYYY-MM-DD formatida bo'lishi kerak" },
        { status: 400 },
      );
    }

    const stats = await getHotelDashboardStats(hotelId, statsDay);
    return NextResponse.json(stats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel stats GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
