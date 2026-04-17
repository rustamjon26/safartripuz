import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "cleaner", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    // Allow all staff in the hotel to see the inventory list (for housekeeping/services)
    const items = await prisma.inventoryItem.findMany({
      where: { hotelId: ctx.hotel.id, ...(ctx.isStaff && ctx.staffRecord.role === 'CLEANER' ? { isHousekeepingSupply: true } : {}) },
      include: { transactions: { take: 5, orderBy: { createdAt: "desc" } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Inventory GET Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const item = await prisma.inventoryItem.create({
      data: {
        hotelId: ctx.hotel.id,
        name: json.name,
        category: json.category || "GENERAL",
        unit: json.unit || "PCS",
        minQuantity: Number(json.minQuantity) || 0,
        quantity: Number(json.quantity) || 0,
      },
    });

    if (json.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          hotelId: ctx.hotel.id,
          inventoryItemId: item.id,
          type: "IN",
          quantity: Number(json.quantity),
          notes: "Initial stock",
        },
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
