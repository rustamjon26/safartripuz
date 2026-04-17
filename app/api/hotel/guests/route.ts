import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const guests = await prisma.guestProfile.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ guests }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const guest = await prisma.guestProfile.create({
      data: {
        hotelId: ctx.hotel.id,
        firstName: json.firstName,
        lastName: json.lastName,
        phone: json.phone,
        email: json.email,
        vipStatus: json.vipStatus || "REGULAR",
        notes: json.notes,
      },
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
