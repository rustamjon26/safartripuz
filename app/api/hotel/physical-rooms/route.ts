import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

// GET physical rooms (optional if we already include them in RoomType GET, but good to have)
export async function GET() {
  try {
    const { id: userId } = await requireUser();
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });
    if (!partner || !partner.hotel) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const physicalRooms = await prisma.physicalRoom.findMany({
      where: { hotelId: partner.hotel.id },
      orderBy: { roomNumber: 'asc' }
    });
    return NextResponse.json({ physicalRooms });
  } catch (e) {
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

// CREATE new Physical Room
export async function POST(req: Request) {
  try {
    const { id: userId } = await requireUser();
    const body = await req.json();
    const { roomTypeId, roomNumber, floor } = body;

    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });
    if (!partner || !partner.hotel) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const newRoom = await prisma.physicalRoom.create({
      data: {
        hotelId: partner.hotel.id,
        roomTypeId,
        roomNumber: String(roomNumber),
        floor: floor ? String(floor) : undefined,
      }
    });
    return NextResponse.json({ physicalRoom: newRoom }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ message: "Bu xona raqami allaqachon mavjud" }, { status: 400 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
