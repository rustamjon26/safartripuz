import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { AppRole } from "@/lib/auth";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

function partnerTypeToRole(type: string): AppRole {
  switch (type) {
    case "hotel":
      return "hotel_manager";
    case "taxi":
      return "taxi";
    case "guide":
      return "guide";
    case "restaurant":
      return "restaurant_manager";
    default:
      return "user";
  }
}

export async function POST(
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

    const partner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        type: true,
        userId: true,
        note: true,
        displayName: true,
        contactEmail: true,
        contactPhone: true,
        meta: true,
      },
    });
    if (!partner) {
      return NextResponse.json({ message: "Partner topilmadi" }, { status: 404 });
    }

    const nextStatus = parsed.data.decision === "approve" ? "approved" : "rejected";

    const result = await prisma.$transaction(async (tx) => {
      const updatedPartner = await tx.partner.update({
        where: { id },
        data: {
          status: nextStatus,
          note: parsed.data.note ?? partner.note ?? null,
        },
        select: {
          id: true,
          status: true,
          type: true,
          note: true,
          userId: true,
        },
      });

      let updatedUser:
        | {
            id: string;
            role: AppRole;
            email: string;
            first_name: string;
            last_name: string;
          }
        | null = null;

      if (nextStatus === "approved") {
        const newRole = partnerTypeToRole(updatedPartner.type);

        const existingUser = await tx.user.findUnique({
          where: { id: updatedPartner.userId },
          select: { id: true, role: true, email: true },
        });

        updatedUser = await tx.user.update({
          where: { id: updatedPartner.userId },
          data: { role: newRole },
          select: {
            id: true,
            role: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "USER_ROLE_UPDATED",
            entity: "User",
            entityId: updatedUser.id,
            oldData: { role: existingUser?.role, email: existingUser?.email },
            newData: { role: updatedUser.role, email: updatedUser.email },
          },
        });

        if (updatedPartner.type === "hotel") {
          await tx.hotel.upsert({
            where: { partnerId: updatedPartner.id },
            update: {
              name: partner.displayName ?? "Hotel",
              city: (partner.meta as any)?.city ?? null,
              address: (partner.meta as any)?.address ?? null,
              contactEmail: partner.contactEmail ?? null,
              contactPhone: partner.contactPhone ?? null,
            },
            create: {
              partnerId: updatedPartner.id,
              status: "draft",
              name: partner.displayName ?? "Hotel",
              city: (partner.meta as any)?.city ?? null,
              address: (partner.meta as any)?.address ?? null,
              contactEmail: partner.contactEmail ?? null,
              contactPhone: partner.contactPhone ?? null,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "HOTEL_CREATED",
              entity: "Hotel",
              entityId: updatedPartner.id,
              newData: {
                partnerId: updatedPartner.id,
                name: partner.displayName ?? "Hotel",
              },
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action:
            nextStatus === "approved" ? "PARTNER_APPROVED" : "PARTNER_REJECTED",
          entity: "Partner",
          entityId: updatedPartner.id,
          oldData: {
            status: partner.status,
            note: partner.note,
            type: partner.type,
          },
          newData: {
            status: updatedPartner.status,
            note: updatedPartner.note,
            type: updatedPartner.type,
          },
        },
      });

      return { partner: updatedPartner, user: updatedUser };
    });

    return NextResponse.json(result, { status: 200 });
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

