import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_BOOKING_DETAIL_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import { BookingDetailError, getBookingDetail } from "@/lib/hotel/getBookingDetail";
import { updateBookingGuest } from "@/lib/hotel/updateBookingGuest";

const patchGuestSchema = z.object({
  guest_name: z.string().trim().min(1),
  guest_phone: z.string().trim().min(1),
  note: z.string().optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
});

export async function GET(
  _req: Request,
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

    console.error("Hotel booking GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}

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

    const parsed = patchGuestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await getBookingDetail(hotelId, bookingId);

    await updateBookingGuest({
      hotelId,
      bookingId,
      actorId: actor.id,
      name: parsed.data.guest_name,
      phone: parsed.data.guest_phone,
      note: parsed.data.note,
      adults: parsed.data.adults ?? existing.guest.adults,
      children: parsed.data.children ?? existing.guest.children,
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

    console.error("Hotel booking PATCH error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
