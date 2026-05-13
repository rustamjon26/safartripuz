import { NextResponse } from "next/server";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const body = await req.json();
    const { first_name, last_name, email, phone, role, isBlocked } = body as Record<
      string,
      unknown
    >;

    const update: Prisma.UserUpdateInput = {};
    if (first_name !== undefined) update.first_name = first_name as string;
    if (last_name !== undefined) update.last_name = last_name as string;
    if (email !== undefined) update.email = email as string;
    if (phone !== undefined) update.phone = phone as string;
    if (role !== undefined) update.role = role as Role;
    if (isBlocked !== undefined) {
      update.isBlocked = isBlocked as boolean;

      if (isBlocked === true) {
        await prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: update,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      });

      // Auto-provision Partner (and Hotel where applicable) when role changes.
      // Mirrors logic from /api/admin/users/[id]/role so the admin UI's
      // generic PATCH endpoint stays in sync.
      if (role !== undefined) {
        // Invalidate any active sessions — the user's old JWT carries the
        // previous role, so their browser must re-authenticate to pick up
        // the new role for middleware-protected routes.
        await tx.refreshToken.updateMany({
          where: { userId: updated.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        const displayName =
          `${updated.first_name} ${updated.last_name}`.trim() || updated.email;
        const newRole = updated.role;

        if (newRole === "hotel_manager") {
          const existing = await tx.partner.findUnique({ where: { userId: updated.id } });
          if (!existing) {
            const partner = await tx.partner.create({
              data: {
                userId: updated.id,
                type: "hotel",
                status: "approved",
                displayName,
                contactEmail: updated.email,
                contactPhone: updated.phone,
              },
            });
            await tx.hotel.create({
              data: {
                partnerId: partner.id,
                status: "active",
                name: `${displayName} Hotel`,
                totalRooms: 10,
                city: "",
                contactEmail: updated.email,
                contactPhone: updated.phone,
              },
            });
          }
        }

        if (newRole === "guide") {
          const existing = await tx.partner.findUnique({ where: { userId: updated.id } });
          if (!existing) {
            await tx.partner.create({
              data: {
                userId: updated.id,
                type: "guide",
                status: "approved",
                displayName,
                contactEmail: updated.email,
                contactPhone: updated.phone,
              },
            });
          }
        }

        if (newRole === "taxi" || newRole === "taxi_partner") {
          const existing = await tx.partner.findUnique({ where: { userId: updated.id } });
          if (!existing) {
            await tx.partner.create({
              data: {
                userId: updated.id,
                type: "taxi",
                status: "approved",
                displayName,
                contactEmail: updated.email,
                contactPhone: updated.phone,
              },
            });
          }
        }

        if (newRole === "home_stay_partner") {
          const existing = await tx.partner.findUnique({ where: { userId: updated.id } });
          if (!existing) {
            await tx.partner.create({
              data: {
                userId: updated.id,
                type: "hotel",
                status: "approved",
                displayName,
                contactEmail: updated.email,
                contactPhone: updated.phone,
              },
            });
          }
        }
      }

      return updated;
    });

    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["super_admin"]);
    const { id } = await params;

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
