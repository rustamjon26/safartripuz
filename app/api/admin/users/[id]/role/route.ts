import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

const schema = z.object({
  role: z.enum([
    "super_admin",
    "admin",
    "user",
    "taxi",
    "hotel_manager",
    "guide",
    "restaurant_manager",
  ]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;

    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "User topilmadi" }, { status: 404 });
    }

    // Only super_admin can assign super_admin
    if (parsed.data.role === "super_admin" && actor.role !== "super_admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Prevent self-demotion from super_admin
    if (actor.id === id && actor.role === "super_admin" && parsed.data.role !== "super_admin") {
      return NextResponse.json(
        { message: "O'zingizni super_admin rolidan tushira olmaysiz" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        role: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "USER_ROLE_UPDATED",
        entity: "User",
        entityId: updated.id,
        oldData: { role: existing.role, email: existing.email },
        newData: { role: updated.role, email: updated.email },
      },
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

