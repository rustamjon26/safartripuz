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
      where: { hotelId: ctx.hotel.id },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ menuItems }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const item = await prisma.menuItem.create({
      data: {
        hotelId: ctx.hotel.id,
        name: json.name,
        description: json.description,
        price: json.price,
        category: json.category || "GENERAL",
        isActive: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const { id, ...data } = json;

    const item = await prisma.menuItem.update({
      where: { id, hotelId: ctx.hotel.id },
      data,
    });

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
      const actor = await requireRole(["hotel_manager", "admin"]);
      const ctx = await getApprovedHotelContextByUserId(actor.id);
      if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });
  
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ message: "ID missing" }, { status: 400 });
  
      // Soft delete by disabling
      const item = await prisma.menuItem.update({
        where: { id, hotelId: ctx.hotel.id },
        data: { isActive: false }
      });
  
      return NextResponse.json({ item }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
  }
