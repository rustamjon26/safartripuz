import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_ROOM_MANAGER_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import {
  CalendarDataError,
  getCalendarData,
  parseCalendarQuery,
} from "@/lib/hotel/getCalendarData";

const roomTypeIdSchema = z.string().trim().min(1).optional();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_MANAGER_ROLES]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const roomTypeRaw = url.searchParams.get("room_type_id");
    if (roomTypeRaw !== null && roomTypeRaw.trim() === "") {
      return NextResponse.json(
        { success: false, error: "room_type_id noto'g'ri" },
        { status: 400 },
      );
    }

    const roomTypeParsed = roomTypeIdSchema.safeParse(roomTypeRaw?.trim() || undefined);
    if (!roomTypeParsed.success) {
      return NextResponse.json(
        { success: false, error: "room_type_id noto'g'ri" },
        { status: 400 },
      );
    }

    let query;
    try {
      query = parseCalendarQuery(url.searchParams);
    } catch (e) {
      if (e instanceof CalendarDataError) {
        return NextResponse.json({ success: false, error: e.message }, { status: e.status });
      }
      throw e;
    }

    const data = await getCalendarData({
      ...query,
      hotelId,
      roomTypeId: roomTypeParsed.data,
    });

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof CalendarDataError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel calendar GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
