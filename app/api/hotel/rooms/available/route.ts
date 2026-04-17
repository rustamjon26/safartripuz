import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "receptionist", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const url = new URL(req.url);
    const roomTypeId = url.searchParams.get("roomTypeId");
    const checkInStr = url.searchParams.get("checkInDate");
    const checkOutStr = url.searchParams.get("checkOutDate");

    if (!roomTypeId || !checkInStr || !checkOutStr) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
    }

    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);

    // 1. Get all physical rooms of this type
    const physicalRooms = await prisma.physicalRoom.findMany({
      where: {
        hotelId: ctx.hotel.id,
        roomTypeId: roomTypeId,
        isActive: true
      },
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        status: true
      }
    });

    // 2. Overlap / Total Capacity Check (Sync with POST logic)
    const concurrentBookings = await prisma.hotelBooking.findMany({
        where: {
            hotelId: ctx.hotel.id,
            roomTypeId,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            AND: [
                { checkInDate: { lt: end } },
                { checkOutDate: { gt: start } }
            ]
        },
        select: { roomCount: true }
    });
    const usedRoomCount = concurrentBookings.reduce((sum, b) => sum + b.roomCount, 0);

    // 3. Find if total capacity is reached
    if (usedRoomCount >= physicalRooms.length) {
        return NextResponse.json({ rooms: [] });
    }

    // 4. Find assignments that overlap with the requested dates
    const overlappingAssignments = await prisma.bookingRoomAssignment.findMany({
      where: {
        status: "ACTIVE",
        physicalRoomId: { in: physicalRooms.map(r => r.id) },
        AND: [
            { checkInDate: { lt: end } },
            { checkOutDate: { gt: start } }
        ]
      },
      select: { physicalRoomId: true }
    });

    const assignedRoomIds = new Set(overlappingAssignments.map(a => a.physicalRoomId));

    // 3. Filter out assigned rooms
    const availableRooms = physicalRooms.filter(r => !assignedRoomIds.has(r.id));

    return NextResponse.json({ rooms: availableRooms });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    console.error("Available Rooms GET Error:", msg);
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
