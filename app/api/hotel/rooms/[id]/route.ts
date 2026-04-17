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
    const { name, description, capacityAdults, capacityChildren, basePrice, isActive, images } = body;

    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });

    if (!partner || !partner.hotel) {
        return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });
    }

    const room = await prisma.roomType.update({
      where: { id, hotelId: partner.hotel.id },
      data: {
        name,
        description,
        capacityAdults: Number(capacityAdults) || undefined,
        capacityChildren: Number(capacityChildren) || undefined,
        basePrice: Number(basePrice) || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        images: images !== undefined ? images : undefined,
      },
      include: { rooms: true }
    });

    return NextResponse.json({ room });
  } catch (e) {
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

    if (!partner || !partner.hotel) {
        return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });
    }

    await prisma.roomType.delete({
      where: { id, hotelId: partner.hotel.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: "O'chirib bo'lmadi (Foydalanilayotgan bo'lishi mumkin)" }, { status: 400 });
  }
}
