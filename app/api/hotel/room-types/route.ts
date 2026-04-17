import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

const createSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().max(500).optional(),
  capacityAdults: z.number().int().min(1).max(20).default(2),
  capacityChildren: z.number().int().min(0).max(20).default(0),
  basePrice: z.number().nonnegative(),
});

export async function GET() {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const items = await prisma.roomType.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { rooms: true } },
      },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const created = await prisma.roomType.create({
      data: {
        hotelId: ctx.hotel.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        capacityAdults: parsed.data.capacityAdults,
        capacityChildren: parsed.data.capacityChildren,
        basePrice: parsed.data.basePrice,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROOM_TYPE_CREATED",
        entity: "RoomType",
        entityId: created.id,
        newData: created,
      },
    });

    return NextResponse.json({ roomType: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

