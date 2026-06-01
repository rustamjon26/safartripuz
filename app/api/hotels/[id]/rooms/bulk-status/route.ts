import { NextResponse } from "next/server";
import { RoomOperationalStatus } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { assertHotelAccess } from "@/lib/hotel/assertHotelAccess";
import {
  BulkUpdateRoomStatusError,
  bulkUpdateRoomStatus,
} from "@/lib/hotel/bulkUpdateRoomStatus";
import { prisma } from "@/lib/prisma";

const bulkStatusBodySchema = z.object({
  room_ids: z
    .array(z.string().trim().min(1))
    .min(1, "room_ids kamida 1 ta bo'lishi kerak")
    .max(100, "room_ids maksimum 100 ta"),
  status: z.nativeEnum(RoomOperationalStatus),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin"]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const parsed = bulkStatusBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validatsiya xatosi",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const result = await bulkUpdateRoomStatus({
      hotelId,
      roomIds: body.room_ids,
      status: body.status,
      note: body.note,
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "PHYSICAL_ROOMS_BULK_STATUS_UPDATED",
        entity: "PhysicalRoom",
        entityId: hotelId,
        newData: {
          status: body.status,
          updatedCount: result.updatedCount,
          roomIds: body.room_ids,
          roomNumbers: result.rooms.map((r) => r.room_number),
          note: body.note ?? null,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        updated_count: result.updatedCount,
        status: result.status,
        rooms: result.rooms,
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof BulkUpdateRoomStatusError) {
      return NextResponse.json(
        {
          success: false,
          error: e.message,
          ...(e.invalid_ids ? { invalid_ids: e.invalid_ids } : {}),
          ...(e.blocked_rooms ? { blocked_rooms: e.blocked_rooms } : {}),
        },
        { status: e.status },
      );
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Bulk room status PATCH error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
