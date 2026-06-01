import { NextResponse } from "next/server";
import { RoomOperationalStatus } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import {
  assertHotelAccess,
  HOTEL_ROOM_MANAGER_ROLES,
} from "@/lib/hotel/assertHotelAccess";
import { prisma } from "@/lib/prisma";

const STATUS_ALIASES: Record<string, RoomOperationalStatus> = {
  available: "AVAILABLE",
  occupied: "OCCUPIED",
  cleaning: "CLEANING",
  maintenance: "MAINTENANCE",
  blocked: "BLOCKED",
};

function parseStatus(raw: string | null): RoomOperationalStatus | null {
  if (!raw) return null;
  const upper = raw.toUpperCase() as RoomOperationalStatus;
  if (Object.values(RoomOperationalStatus).includes(upper)) return upper;
  return STATUS_ALIASES[raw.toLowerCase()] ?? null;
}

const fieldKeys = ["id", "roomNumber", "room_number", "status", "floor", "roomTypeId"] as const;

function parseFields(raw: string | null) {
  if (!raw) {
    return ["id", "room_number", "status", "floor", "room_type_id"] as const;
  }

  const requested = raw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const invalid = requested.filter(
    (f) => !fieldKeys.includes(f as (typeof fieldKeys)[number]),
  );
  if (invalid.length > 0) {
    throw new Error(`INVALID_FIELDS:${invalid.join(",")}`);
  }

  return requested.map((f) => (f === "roomNumber" ? "room_number" : f));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_MANAGER_ROLES]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const status = parseStatus(url.searchParams.get("status"));
    if (url.searchParams.get("status") && !status) {
      return NextResponse.json(
        { success: false, error: "Noto'g'ri status parametri" },
        { status: 400 },
      );
    }

    let fields: string[];
    try {
      fields = [...parseFields(url.searchParams.get("fields"))];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("INVALID_FIELDS:")) {
        return NextResponse.json(
          { success: false, error: "Noto'g'ri fields parametri", invalid: msg.split(":")[1]?.split(",") },
          { status: 400 },
        );
      }
      throw e;
    }

    const rooms = await prisma.physicalRoom.findMany({
      where: {
        hotelId,
        isActive: true,
        ...(status ? { status } : {}),
      },
      orderBy: { roomNumber: "asc" },
      select: {
        id: true,
        roomNumber: true,
        status: true,
        floor: true,
        roomTypeId: true,
      },
    });

    return NextResponse.json({
      success: true,
      items: rooms.map((room) => ({
        ...(fields.includes("id") ? { id: room.id } : {}),
        ...(fields.includes("room_number") ? { room_number: room.roomNumber } : {}),
        ...(fields.includes("status") ? { status: room.status } : {}),
        ...(fields.includes("floor") ? { floor: room.floor } : {}),
        ...(fields.includes("room_type_id") ? { room_type_id: room.roomTypeId } : {}),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel rooms GET error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
