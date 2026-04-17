import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

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

    const physicalRoom = await prisma.physicalRoom.update({
      where: { id, hotelId: partner.hotel.id },
      data: {
        roomNumber: roomNumber !== undefined ? String(roomNumber) : undefined,
        floor: floor !== undefined ? String(floor) : undefined,
        status: status !== undefined ? status : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    return NextResponse.json({ physicalRoom });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ message: "Bu xona raqami allaqachon band" }, { status: 400 });
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

    await prisma.physicalRoom.delete({
      where: { id, hotelId: partner.hotel.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: "O'chirib bo'lmadi (Foydalanilayotgan bo'lishi mumkin)" }, { status: 400 });
  }
}
