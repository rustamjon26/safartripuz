import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { HomeStayListingStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const allowedStatuses: HomeStayListingStatus[] = ["ACTIVE", "INACTIVE", "REJECTED", "BLOCKED"];

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const listing = await prisma.homeStayListing.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
        reviews: { include: { guest: { select: { id: true, first_name: true, last_name: true } } } },
        availabilities: { orderBy: { startDate: "asc" } },
        bookings: { orderBy: { createdAt: "desc" }, include: { guest: { select: { id: true, first_name: true, last_name: true } } } },
      },
    });
    if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    return NextResponse.json({ listing }, { status: 200 });
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
    const { status, note } = body as { status?: HomeStayListingStatus; note?: string };

    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.homeStayListing.findUnique({
      where: { id },
      select: { id: true, status: true, verificationNote: true },
    });
    if (!existing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });

    const updated = await prisma.homeStayListing.update({
      where: { id },
      data: {
        status,
        verificationNote: note ?? existing.verificationNote,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ADMIN_HOMESTAY_LISTING_STATUS_UPDATED",
        entity: "HomeStayListing",
        entityId: updated.id,
        oldData: { status: existing.status, note: existing.verificationNote },
        newData: { status: updated.status, note: updated.verificationNote },
      },
    });

    return NextResponse.json({ listing: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
