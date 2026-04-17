import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const { id } = await ctx.params;
    const json = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new Error("Item not found");

      const trans = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          hotelId: hotelCtx.hotel.id,
          type: json.type, // IN or OUT
          quantity: Number(json.quantity),
          notes: json.notes,
        },
      });

      const newQty = json.type === "IN" 
        ? Number(item.quantity) + Number(json.quantity)
        : Number(item.quantity) - Number(json.quantity);

      await tx.inventoryItem.update({
        where: { id },
        data: { quantity: newQty },
      });

      return trans;
    });

    return NextResponse.json({ transaction: result }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
