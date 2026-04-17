import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const item = await prisma.folioItem.create({
      data: {
        hotelId: ctx.hotel.id,
        bookingId: json.bookingId,
        category: json.category || "ROOM",
        description: json.description,
        amount: json.amount,
        isPaid: false
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
