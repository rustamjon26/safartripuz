import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_ROOM_MANAGER_ROLES,
  HOTEL_ROOM_WRITE_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import { roomTypeBodySchema, serializeRoomType } from "@/lib/hotel/roomTypeSchema";

const listSelect = {
  id: true,
  name: true,
  description: true,
  basePrice: true,
  capacityAdults: true,
  capacityChildren: true,
  amenities: true,
  images: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { rooms: true } },
} as const;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; roomTypeId: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_WRITE_ROLES]);
    const { id: hotelId, roomTypeId: id } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const existing = await prisma.roomType.findFirst({
      where: { id, hotelId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Xona turi topilmadi" }, { status: 404 });
    }

    const parsed = roomTypeBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description ?? null,
        basePrice: data.basePrice,
        capacityAdults: data.capacityAdults,
        capacityChildren: data.capacityChildren,
        amenities: data.amenities ?? [],
        images: data.images ?? [],
        isActive: data.isActive ?? true,
      },
      select: listSelect,
    });

    try {
      const { ratesService } = await import("@/src/modules/rates");
      await ratesService.syncBasePlanFromRoomType(updated.id);
    } catch (syncErr) {
      console.error("[rates] syncBasePlanFromRoomType failed", syncErr);
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROOM_TYPE_UPDATED",
        entity: "RoomType",
        entityId: updated.id,
        newData: updated,
      },
    });

    return NextResponse.json({ success: true, roomType: serializeRoomType(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; roomTypeId: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_WRITE_ROLES]);
    const { id: hotelId, roomTypeId: id } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id, hotelId },
      select: {
        id: true,
        name: true,
        _count: { select: { rooms: true } },
      },
    });

    if (!roomType) {
      return NextResponse.json({ success: false, error: "Xona turi topilmadi" }, { status: 404 });
    }

    if (roomType._count.rooms > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `"${roomType.name}" turiga bog'langan ${roomType._count.rooms} ta jismoniy xona mavjud. Avval ularni o'chiring yoki boshqa turga o'tkazing.`,
          roomsCount: roomType._count.rooms,
        },
        { status: 409 },
      );
    }

    await prisma.roomType.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROOM_TYPE_DELETED",
        entity: "RoomType",
        entityId: id,
        oldData: { name: roomType.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; roomTypeId: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_MANAGER_ROLES]);
    const { id: hotelId, roomTypeId: id } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id, hotelId },
      select: listSelect,
    });

    if (!roomType) {
      return NextResponse.json({ success: false, error: "Xona turi topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ success: true, roomType: serializeRoomType(roomType) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
