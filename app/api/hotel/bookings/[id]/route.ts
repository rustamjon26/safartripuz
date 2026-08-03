import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { bookingService } from "@/src/modules/booking";

const ACTIVE_STATUSES = ["PENDING", "HELD", "PAID", "CONFIRMED"] as const;
const TERMINAL_STATUSES = [
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
  "NO_SHOW",
  "COMPLETED",
] as const;

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireRole(["hotel_manager", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const booking = await prisma.hotelBooking.findUnique({
      where: { id },
      select: { hotelId: true, status: true },
    });

    if (!booking || booking.hotelId !== ctx.hotel.id) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Active bookings must go through the state machine so held/confirmed
    // room-nights are returned to inventory — never a silent hard delete.
    if ((ACTIVE_STATUSES as readonly string[]).includes(booking.status)) {
      await bookingService.cancelAndRelease(id, {
        actor: "PARTNER",
        reason: "DELETED_BY_HOTEL",
      });
      return NextResponse.json({ success: true, cancelled: true });
    }

    if (booking.status === "CHECKED_IN") {
      return NextResponse.json(
        { message: "Mehmon joylashgan bronni o'chirib bo'lmaydi" },
        { status: 409 },
      );
    }

    if (!(TERMINAL_STATUSES as readonly string[]).includes(booking.status)) {
      return NextResponse.json(
        { message: `Bu holatdagi bronni o'chirib bo'lmaydi: ${booking.status}` },
        { status: 409 },
      );
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "HOTEL_BOOKING_DELETED",
        entity: "HotelBooking",
        entityId: id,
        oldData: { status: booking.status, hotelId: booking.hotelId },
      },
    });
    await prisma.hotelBooking.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking DELETE Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/**
 * Guest-info-only PATCH. Money (totalAmount/paidAmount), dates, source,
 * status, and hold fields are NOT editable here:
 * - status → /api/hotel/bookings/[id]/status (state machine)
 * - payments → /api/hotel/finance/payment
 */
const patchBookingSchema = z.object({
  guestName: z.string().trim().min(1).max(191).optional(),
  guestPhone: z.string().trim().max(32).nullable().optional(),
  passportData: z.string().trim().max(2000).nullable().optional(),
  nationality: z.string().trim().max(100).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const actor = await requireRole(["hotel_manager", "receptionist"]);
        const ctx = await getApprovedHotelContextByUserId(actor.id);
        if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

        const parsed = patchBookingSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ message: "Validation error" }, { status: 400 });
        }
        const d = parsed.data;

        const booking = await prisma.hotelBooking.findUnique({
            where: { id },
            select: { hotelId: true }
        });

        if (!booking || booking.hotelId !== ctx.hotel.id) {
            return NextResponse.json({ message: "Booking not found" }, { status: 404 });
        }

        const updated = await prisma.hotelBooking.update({
            where: { id },
            data: {
                ...(d.guestName !== undefined ? { guestName: d.guestName } : {}),
                ...(d.guestPhone !== undefined ? { guestPhone: d.guestPhone } : {}),
                ...(d.passportData !== undefined ? { passportData: d.passportData } : {}),
                ...(d.nationality !== undefined ? { nationality: d.nationality } : {}),
                ...(d.birthDate !== undefined
                    ? { birthDate: d.birthDate ? new Date(d.birthDate) : null }
                    : {}),
                ...(d.note !== undefined ? { note: d.note } : {}),
            },
        });

        return NextResponse.json({ booking: updated });
    } catch (error) {
        console.error("Booking PATCH Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
