import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { assertHotelAccess, HOTEL_ROOM_WRITE_ROLES } from "@/lib/hotel/assertHotelAccess";
import { getHotelReports, HotelReportsError } from "@/lib/hotel/getHotelReports";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  group_by: z.enum(["day", "week", "month"]).default("day"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_WRITE_ROLES]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const report = await getHotelReports({
      hotelId,
      start: parsed.data.start,
      end: parsed.data.end,
      groupBy: parsed.data.group_by,
    });

    return NextResponse.json(report);
  } catch (e) {
    if (e instanceof HotelReportsError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel reports GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
