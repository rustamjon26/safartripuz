import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "cleaner", "receptionist"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const { id } = await ctx.params;
    const json = await req.json();

    const task = await prisma.housekeepingTask.findFirst({
       where: { id, hotelId: hotelCtx.hotel.id }
    });
    if(!task) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const updatedTask = await prisma.$transaction(async (tx) => {
      // 1. Update Task Status
      const u = await tx.housekeepingTask.update({
        where: { id: task.id },
        data: { status: json.status }
      });

      // 2. Handle Consumptions
      if (json.status === "DONE" && json.consumptions && Array.isArray(json.consumptions)) {
        for (const item of json.consumptions) {
          // Record Consumption
          await tx.taskConsumption.create({
            data: {
              taskId: task.id,
              inventoryItemId: item.itemId,
              quantity: item.quantity,
              notes: "Housekeeping cleaning consumption"
            }
          });

          // Decrement Inventory
          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { decrement: item.quantity } }
          });
        }
      }

      // 3. Update Room Status
      if(json.status === "DONE" && task.taskType === "CLEANING") {
        await tx.physicalRoom.update({
          where: { id: task.physicalRoomId },
          data: { status: "AVAILABLE" }
        });
      }

      return u;
    });

    return NextResponse.json({ task: updatedTask }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const { id } = await ctx.params;
    
    await prisma.housekeepingTask.deleteMany({
       where: { id, hotelId: hotelCtx.hotel.id }
    });

    return NextResponse.json({ message: "Deleted" }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
