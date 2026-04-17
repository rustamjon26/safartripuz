import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager", "receptionist", "admin"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const checkInRaw = searchParams.get("checkInDate");
    const checkOutRaw = searchParams.get("checkOutDate");
    const roomTypeId = searchParams.get("roomTypeId");

    if (!checkInRaw || !checkOutRaw) {
      return NextResponse.json({ message: "checkInDate/checkOutDate required" }, { status: 400 });
    }

    const checkIn = new Date(checkInRaw);
    const checkOut = new Date(checkOutRaw);
    if (!(checkOut > checkIn)) {
      return NextResponse.json(
        { message: "Check-out sanasi check-in dan keyin bo‘lishi kerak" },
        { status: 400 },
      );
    }

    if (roomTypeId) {
      const roomType = await prisma.roomType.findFirst({
        where: { id: roomTypeId, hotelId: ctx.hotel.id, isActive: true },
        select: { id: true, name: true },
      });
      if (!roomType) {
        return NextResponse.json({ message: "Room type topilmadi" }, { status: 404 });
      }

      const rooms = await prisma.physicalRoom.findMany({
        where: {
          hotelId: ctx.hotel.id,
          roomTypeId: roomType.id,
          isActive: true,
          status: { in: ["AVAILABLE", "CLEANING"] },
        },
        select: { id: true },
      });
      const roomIds = rooms.map((r) => r.id);

      const busyBookings = await prisma.hotelBooking.findMany({
        where: {
          hotelId: ctx.hotel.id,
          roomTypeId: roomType.id,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          AND: [
              { checkInDate: { lt: checkOut } },
              { checkOutDate: { gt: checkIn } }
          ]
        },
        select: { roomCount: true }
      });

      const usedRoomCount = busyBookings.reduce((sum, b) => sum + b.roomCount, 0);
      const availableRooms = Math.max(roomIds.length - usedRoomCount, 0);

      return NextResponse.json(
        {
          roomTypeId: roomType.id,
          totalRooms: roomIds.length,
          usedRooms: usedRoomCount,
          availableRooms,
        },
        { status: 200 },
      );
    }

    const overlaps = await prisma.hotelBooking.findMany({
      where: {
        hotelId: ctx.hotel.id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
      select: { roomCount: true },
    });

    const usedRooms = overlaps.reduce((sum, b) => sum + b.roomCount, 0);
    const availableRooms = Math.max(ctx.hotel.totalRooms - usedRooms, 0);

    return NextResponse.json(
      {
        totalRooms: ctx.hotel.totalRooms,
        usedRooms,
        availableRooms,
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

