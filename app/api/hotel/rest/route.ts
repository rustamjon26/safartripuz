import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist", "waiter"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const menuItems = await prisma.menuItem.findMany({
      where: { hotelId: ctx.hotel.id, isActive: true },
      orderBy: { category: "asc" },
    });

    const activeBookings = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id, status: "CHECKED_IN" },
      select: { id: true, guestName: true },
    });

    return NextResponse.json({ menuItems, activeBookings }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "waiter", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();

    const order = await prisma.$transaction(async (tx) => {
      const ord = await tx.restaurantOrder.create({
        data: {
          hotelId: ctx.hotel.id,
          bookingId: json.bookingId || null,
          tableNumber: json.tableNumber || null,
          items: json.items,
          totalAmount: json.totalAmount,
          status: "SERVED",
          isChargedToRoom: !!json.bookingId,
        },
      });

      if (json.bookingId) {
        await tx.folioItem.create({
          data: {
            hotelId: ctx.hotel.id,
            bookingId: json.bookingId,
            category: "RESTAURANT",
            description: `Restoran buyurtmasi #${ord.id.slice(-4)}`,
            amount: json.totalAmount,
          },
        });
      }
      return ord;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
