import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { BulkRoomsError, bulkCreatePhysicalRooms } from "@/lib/hotel/bulkCreateRooms";
import { assertHotelAccess } from "@/lib/hotel/assertHotelAccess";
import { prisma } from "@/lib/prisma";

const bulkBodySchema = z
  .object({
    room_type_id: z.string().trim().min(1, "room_type_id majburiy"),
    count: z.number().int().min(1).max(200).optional(),
    start_number: z.number().int().min(1).max(9999).optional(),
    floor: z.number().int().min(1).max(99),
    number_prefix: z.string().trim().max(10).optional(),
    custom_numbers: z.array(z.string().trim().min(1).max(20)).max(200).optional(),
  })
  .superRefine((data, ctx) => {
    const hasCustom = (data.custom_numbers?.length ?? 0) > 0;
    if (!hasCustom) {
      if (data.count == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "count majburiy (custom_numbers bo'lmasa)",
          path: ["count"],
        });
      }
      if (data.start_number == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "start_number majburiy (custom_numbers bo'lmasa)",
          path: ["start_number"],
        });
      }
    }
  });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["hotel_manager", "admin", "super_admin", "receptionist"]);
    const { id: hotelId } = await params;

    const hotel = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const parsed = bulkBodySchema.safeParse(await req.json());
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
    const result = await bulkCreatePhysicalRooms({
      hotelId,
      roomTypeId: body.room_type_id,
      floor: body.floor,
      count: body.count,
      startNumber: body.start_number,
      numberPrefix: body.number_prefix,
      customNumbers: body.custom_numbers,
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "PHYSICAL_ROOMS_BULK_CREATED",
        entity: "PhysicalRoom",
        entityId: hotelId,
        newData: {
          roomTypeId: body.room_type_id,
          createdCount: result.createdCount,
          roomNumbers: result.rooms.map((r) => r.room_number),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        created_count: result.createdCount,
        rooms: result.rooms,
        skipped: result.skipped,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof BulkRoomsError) {
      return NextResponse.json(
        {
          success: false,
          error: e.message,
          duplicates: e.duplicates ?? [],
          skipped: e.duplicates ?? [],
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

    console.error("Bulk rooms POST error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
