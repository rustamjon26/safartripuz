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
    "taxi_partner",
    "hotel_manager",
    "guide",
    "restaurant_manager",
    "home_stay_partner",
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
      select: {
        id: true,
        role: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
      },
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

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { role: parsed.data.role },
        select: {
          id: true,
          role: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
        },
      });

      const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email;
      const newRole = user.role;

      if (newRole === "hotel_manager") {
        const existingPartner = await tx.partner.findUnique({
          where: { userId: user.id },
        });
        if (!existingPartner) {
          const partner = await tx.partner.create({
            data: {
              userId: user.id,
              type: "hotel",
              status: "approved",
              displayName,
              contactEmail: user.email,
              contactPhone: user.phone,
            },
          });
          await tx.hotel.create({
            data: {
              partnerId: partner.id,
              status: "active",
              name: `${displayName} Hotel`,
              totalRooms: 10,
              city: "",
              contactEmail: user.email,
              contactPhone: user.phone,
            },
          });
        }
      }

      if (newRole === "guide") {
        const existingPartner = await tx.partner.findUnique({
          where: { userId: user.id },
        });
        if (!existingPartner) {
          await tx.partner.create({
            data: {
              userId: user.id,
              type: "guide",
              status: "approved",
              displayName,
              contactEmail: user.email,
              contactPhone: user.phone,
            },
          });
        }
      }

      if (newRole === "taxi" || newRole === "taxi_partner") {
        const existingPartner = await tx.partner.findUnique({
          where: { userId: user.id },
        });
        if (!existingPartner) {
          await tx.partner.create({
            data: {
              userId: user.id,
              type: "taxi",
              status: "approved",
              displayName,
              contactEmail: user.email,
              contactPhone: user.phone,
            },
          });
        }
      }

      if (newRole === "home_stay_partner") {
        const existingPartner = await tx.partner.findUnique({
          where: { userId: user.id },
        });
        if (!existingPartner) {
          await tx.partner.create({
            data: {
              userId: user.id,
              type: "hotel",
              status: "approved",
              displayName,
              contactEmail: user.email,
              contactPhone: user.phone,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "USER_ROLE_UPDATED",
          entity: "User",
          entityId: user.id,
          oldData: { role: existing.role, email: existing.email },
          newData: { role: user.role, email: user.email },
        },
      });

      return {
        id: user.id,
        role: user.role,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      };
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

