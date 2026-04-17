import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;

    const partner = await prisma.user.findFirst({
      where: { id, role: "home_stay_partner" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        homeStayListings: {
          include: {
            bookings: {
              select: {
                id: true,
                status: true,
                totalPrice: true,
                createdAt: true,
              },
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!partner) return NextResponse.json({ message: "Partner not found" }, { status: 404 });
    return NextResponse.json({ partner }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const body = await req.json();
    const { action } = body as { action?: "block" | "unblock" };
    if (!action || !["block", "unblock"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id, role: "home_stay_partner" },
      select: { id: true, isBlocked: true },
    });
    if (!existing) return NextResponse.json({ message: "Partner not found" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: action === "block" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
        isBlocked: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: action === "block" ? "ADMIN_HOMESTAY_PARTNER_BLOCKED" : "ADMIN_HOMESTAY_PARTNER_UNBLOCKED",
        entity: "User",
        entityId: updated.id,
        oldData: { isBlocked: existing.isBlocked },
        newData: { isBlocked: updated.isBlocked },
      },
    });

    return NextResponse.json({ partner: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
