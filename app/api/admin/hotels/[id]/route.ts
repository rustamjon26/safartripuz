import type { HotelStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { isForeignKeyViolation } from "@/lib/prismaErrors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, name, totalRooms, city, address, contactEmail, contactPhone } =
      body as Record<string, unknown>;

    const data: Prisma.HotelUpdateInput = {};
    if (status !== undefined) {
      if (typeof status !== "string" || !["draft", "active", "suspended"].includes(status)) {
        return NextResponse.json({ message: "Noto'g'ri status" }, { status: 400 });
      }
      data.status = status as HotelStatus;
    }
    if (name !== undefined) data.name = name as string;
    if (city !== undefined) data.city = city as string | null;
    if (address !== undefined) data.address = address as string | null;
    if (contactEmail !== undefined) data.contactEmail = contactEmail as string | null;
    if (contactPhone !== undefined) data.contactPhone = contactPhone as string | null;
    if (totalRooms !== undefined) data.totalRooms = Number(totalRooms);

    const hotel = await prisma.hotel.update({
      where: { id },
      data,
    });

    return NextResponse.json({ hotel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    await prisma.hotel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (isForeignKeyViolation(e)) {
      return NextResponse.json(
        {
          message:
            "Bu mehmonxonada bronlar bor — o'chirib bo'lmaydi. Statusni 'inactive' qiling.",
        },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
