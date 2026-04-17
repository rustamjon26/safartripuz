import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

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
      select: { hotelId: true }
    });

    if (!booking || booking.hotelId !== ctx.hotel.id) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    await prisma.hotelBooking.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking DELETE Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const actor = await requireRole(["hotel_manager", "receptionist"]);
        const ctx = await getApprovedHotelContextByUserId(actor.id);
        if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

        const body = await req.json();
        const booking = await prisma.hotelBooking.findUnique({
            where: { id },
            select: { hotelId: true }
        });

        if (!booking || booking.hotelId !== ctx.hotel.id) {
            return NextResponse.json({ message: "Booking not found" }, { status: 404 });
        }

        const updated = await prisma.hotelBooking.update({
            where: { id },
            data: body // simplified patch
        });

        return NextResponse.json({ booking: updated });
    } catch (error) {
        console.error("Booking PATCH Error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
