import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_BOOKING_DETAIL_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import { BookingDetailError, getBookingDetail } from "@/lib/hotel/getBookingDetail";
import { updateBookingStatus } from "@/lib/hotel/updateBookingStatus";

const bodySchema = z.object({
  status: z.enum(["CHECKED_IN", "CHECKED_OUT", "CANCELLED", "CONFIRMED"]),
  note: z.string().trim().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_BOOKING_DETAIL_ROLES]);
    const { id: hotelId, bookingId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await updateBookingStatus({
      hotelId,
      bookingId,
      status: parsed.data.status,
      note: parsed.data.note,
      actorId: actor.id,
    });

    const booking = await getBookingDetail(hotelId, bookingId);
    return NextResponse.json(booking);
  } catch (e) {
    if (e instanceof BookingDetailError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel booking status PATCH error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
