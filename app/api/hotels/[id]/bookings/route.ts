import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_ROOM_MANAGER_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import { createQuickBooking, QuickBookingError } from "@/lib/hotel/createQuickBooking";
import { ListBookingsError, listHotelBookings } from "@/lib/hotel/listHotelBookings";

const querySchema = z
  .object({
    status: z
      .enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"])
      .optional(),
    date_filter: z.enum(["today", "week", "month"]).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((data, ctx) => {
    if (data.date_filter && (data.start_date || data.end_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start_date/end_date date_filter bilan bir vaqtda ishlatilmaydi",
        path: ["start_date"],
      });
    }
  });

const bodySchema = z.object({
  room_id: z.string().trim().min(1),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().trim().min(1),
  guest_phone: z.string().trim().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  note: z.string().optional(),
  payment_method: z.enum(["CASH", "CLICK", "PAYME", "UZUM"]),
  status: z.enum(["CONFIRMED", "PENDING"]).default("CONFIRMED"),
});

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
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const result = await listHotelBookings({
      hotelId,
      status: data.status as BookingStatus | undefined,
      dateFilter: data.date_filter,
      startDate: data.date_filter ? undefined : data.start_date,
      endDate: data.date_filter ? undefined : data.end_date,
      search: data.search,
      page: data.page,
      perPage: data.per_page,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ListBookingsError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel bookings GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(
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

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const booking = await createQuickBooking({
      hotelId,
      roomId: data.room_id,
      checkIn: data.check_in,
      checkOut: data.check_out,
      guestName: data.guest_name,
      guestPhone: data.guest_phone,
      adults: data.adults,
      children: data.children,
      note: data.note,
      paymentMethod: data.payment_method,
      status: data.status as BookingStatus,
    });

    return NextResponse.json({ success: true, booking: { id: booking.id } }, { status: 201 });
  } catch (e) {
    if (e instanceof QuickBookingError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel quick booking POST error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
