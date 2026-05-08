import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "cleaner", "receptionist"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const where: Prisma.HousekeepingTaskWhereInput = { hotelId: ctx.hotel.id };

    if (ctx.isStaff && ctx.staffRecord && ctx.staffRecord.role === "CLEANER") {
      where.staffId = ctx.staffRecord.id;
    }

    const [tasks, rooms, staffList] = await Promise.all([
      prisma.housekeepingTask.findMany({
        where,
        include: {
          physicalRoom: { include: { roomType: true } },
          staff: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.physicalRoom.findMany({
        where: { hotelId: ctx.hotel.id, isActive: true },
        include: { roomType: true },
      }),
      prisma.hotelStaff.findMany({
        where: { hotelId: ctx.hotel.id, role: { in: ["CLEANER", "RECEPTION"] } },
      }),
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

    const json = (await req.json()) as {
      physicalRoomId?: string;
      staffId?: string | null;
      assigneeName?: string;
      taskType?: string;
      priority?: string;
      notes?: string | null;
    };
    const task = await prisma.housekeepingTask.create({
      data: {
        hotelId: ctx.hotel.id,
        physicalRoomId: json.physicalRoomId ?? "",
        staffId: json.staffId ?? null,
        assigneeName: json.assigneeName || "Dispetcher",
        taskType: json.taskType || "CLEANING",
        priority: json.priority || "NORMAL",
        notes: json.notes,
        status: "PENDING",
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
