import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { inventoryService } from "@/src/modules/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: userId } = await requireUser();
    const body = await req.json();
    const { roomNumber, floor, status, isActive } = body;

    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });
    if (!partner || !partner.hotel) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const before = await prisma.physicalRoom.findFirst({
      where: { id, hotelId: partner.hotel.id },
      select: { isActive: true, roomTypeId: true },
    });
    if (!before) return NextResponse.json({ message: "Xona topilmadi" }, { status: 404 });

    const physicalRoom = await prisma.physicalRoom.update({
      where: { id, hotelId: partner.hotel.id },
      data: {
        roomNumber: roomNumber !== undefined ? String(roomNumber) : undefined,
        floor: floor !== undefined ? String(floor) : undefined,
        status: status !== undefined ? status : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    if (typeof isActive === "boolean" && isActive !== before.isActive) {
      await inventoryService.adjustTotalRooms(before.roomTypeId, isActive ? 1 : -1);
    }

    return NextResponse.json({ physicalRoom });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ message: "Bu xona raqami allaqachon band" }, { status: 400 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: userId } = await requireUser();

    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });
    if (!partner || !partner.hotel) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const existing = await prisma.physicalRoom.findFirst({
      where: { id, hotelId: partner.hotel.id },
      select: { roomTypeId: true, isActive: true },
    });
    if (!existing) return NextResponse.json({ message: "Xona topilmadi" }, { status: 404 });

    await prisma.physicalRoom.delete({
      where: { id, hotelId: partner.hotel.id },
    });

    if (existing.isActive) {
      await inventoryService.adjustTotalRooms(existing.roomTypeId, -1);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: "O'chirib bo'lmadi (Foydalanilayotgan bo'lishi mumkin)" }, { status: 400 });
  }
}
