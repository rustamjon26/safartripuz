import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET() {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const rooms = await prisma.roomType.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { basePrice: "asc" },
      include: {
        rooms: true,
      }
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Rooms GET Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const body = await req.json();
    const { name, description, capacityAdults, capacityChildren, basePrice, images } = body;

    const room = await prisma.roomType.create({
      data: {
        hotelId: ctx.hotel.id,
        name,
        description,
        capacityAdults: Number(capacityAdults || 2),
        capacityChildren: Number(capacityChildren || 0),
        basePrice: Number(basePrice || 0),
        images: images || [],
      },
      include: { rooms: true }
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error("Rooms POST Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
