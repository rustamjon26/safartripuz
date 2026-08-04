import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  demotePartnerIfRoleLeft,
  ensureApprovedGuidePartner,
  ensureApprovedTaxiPartner,
} from "@/lib/partner";
import { ensureApprovedHotelManagerSetup } from "@/lib/hotel";

const roleSchema = z.enum([
  "super_admin",
  "admin",
  "user",
  "taxi",
  "taxi_partner",
  "hotel_manager",
  "guide",
  "restaurant_manager",
  "home_stay_partner",
  "support",
  "cleaner",
  "receptionist",
  "waiter",
  "hotel_staff",
]);

const patchUserSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(191).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
  role: roleSchema.optional(),
  isBlocked: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await params;
    const parsed = patchUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const { first_name, last_name, email, phone, role, isBlocked } = parsed.data;

    if (role !== undefined) {
      // Same guards as /api/admin/users/[id]/role — this generic PATCH must
      // not be an escalation bypass.
      if (
        (role === "super_admin" || role === "admin") &&
        actor.role !== "super_admin"
      ) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      if (actor.id === id && actor.role === "super_admin" && role !== "super_admin") {
        return NextResponse.json(
          { message: "O'zingizni super_admin rolidan tushira olmaysiz" },
          { status: 400 },
        );
      }
    }

    const update: Prisma.UserUpdateInput = {};
    if (first_name !== undefined) update.first_name = first_name;
    if (last_name !== undefined) update.last_name = last_name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (isBlocked !== undefined) {
      update.isBlocked = isBlocked;

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
          await ensureApprovedHotelManagerSetup(
            {
              userId: updated.id,
              displayName,
              contactEmail: updated.email,
              contactPhone: updated.phone,
            },
            tx,
          );
        }

        if (newRole === "guide") {
          await ensureApprovedGuidePartner(tx, {
            userId: updated.id,
            displayName,
            contactEmail: updated.email,
            contactPhone: updated.phone,
          });
        }

        if (newRole === "taxi" || newRole === "taxi_partner") {
          await ensureApprovedTaxiPartner(tx, {
            userId: updated.id,
            displayName,
            contactEmail: updated.email,
            contactPhone: updated.phone,
          });
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
          } else if (existing.status !== "approved" || existing.type !== "hotel") {
            await tx.partner.update({
              where: { id: existing.id },
              data: {
                type: "hotel",
                status: "approved",
                displayName: existing.displayName ?? displayName,
                contactEmail: existing.contactEmail ?? updated.email,
                contactPhone: existing.contactPhone ?? updated.phone,
              },
            });
          }
        }

        await demotePartnerIfRoleLeft(tx, updated.id, newRole);

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "USER_ROLE_UPDATED",
            entity: "User",
            entityId: updated.id,
            newData: { role: updated.role, email: updated.email },
          },
        });
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
