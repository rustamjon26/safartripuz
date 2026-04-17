import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "cleaner", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const where: any = { hotelId: ctx.hotel.id };
    
    // If it's a staff member (Cleaner/Reception), they should only see their own tasks 
    // unless they have higher management permissions. 
    // For now, if role is CLEANER, filter by staffId.
    if (ctx.isStaff && ctx.staffRecord.role === "CLEANER") {
      where.staffId = ctx.staffRecord.id;
    }

    const [tasks, rooms, staffList] = await Promise.all([
      prisma.housekeepingTask.findMany({
        where,
        include: {
           physicalRoom: { include: { roomType: true } },
           staff: true
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.physicalRoom.findMany({
        where: { hotelId: ctx.hotel.id, isActive: true },
        include: { roomType: true }
      }),
      prisma.hotelStaff.findMany({
        where: { hotelId: ctx.hotel.id, role: { in: ["CLEANER", "RECEPTION"] } }
      })
    ]);

    return NextResponse.json({ tasks, rooms, staffList }, { status: 200 });
  } catch (error) {
    console.error("Housekeeping GET Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const task = await prisma.housekeepingTask.create({
      data: {
        hotelId: ctx.hotel.id,
        physicalRoomId: json.physicalRoomId,
        staffId: json.staffId || null,
        assigneeName: json.assigneeName || "Dispetcher",
        taskType: json.taskType || "CLEANING",
        priority: json.priority || "NORMAL",
        notes: json.notes,
        status: "PENDING"
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
