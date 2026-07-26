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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_MANAGER_ROLES]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const items = await prisma.roomType.findMany({
      where: { hotelId },
      orderBy: { basePrice: "asc" },
      select: listSelect,
    });

    return NextResponse.json({
      success: true,
      items: items.map(serializeRoomType),
    });
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_WRITE_ROLES]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json({ success: false, error: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const parsed = roomTypeBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const created = await prisma.roomType.create({
      data: {
        hotelId,
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
      await ratesService.syncBasePlanFromRoomType(created.id);
    } catch (syncErr) {
      console.error("[rates] syncBasePlanFromRoomType failed", syncErr);
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROOM_TYPE_CREATED",
        entity: "RoomType",
        entityId: created.id,
        newData: created,
      },
    });

    return NextResponse.json(
      { success: true, roomType: serializeRoomType(created) },
      { status: 201 },
    );
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
