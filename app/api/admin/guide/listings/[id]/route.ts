import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GuideListingStatus } from "@prisma/client";
import { requireGuideAdmin, unauthorizedResponse } from "../../_utils";

type Ctx = { params: Promise<{ id: string }> };

const allowedStatuses: GuideListingStatus[] = ["PENDING", "ACTIVE", "INACTIVE", "REJECTED", "BLOCKED"];

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireGuideAdmin();
    const { id } = await ctx.params;
    const listing = await prisma.guideListing.findUnique({
      where: { id },
      include: {
        host: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true, isBlocked: true },
        },
        reviews: {
          include: { guest: { select: { id: true, first_name: true, last_name: true } } },
          orderBy: { createdAt: "desc" },
        },
        availabilities: { orderBy: { dayOfWeek: "asc" } },
        blockedSlots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
        bookings: {
          orderBy: { createdAt: "desc" },
          include: {
            guest: { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
          },
        },
      },
    });
    if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    return NextResponse.json({ listing }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireGuideAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, note } = body as { status?: GuideListingStatus; note?: string };

    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.guideListing.findUnique({
      where: { id },
      select: { id: true, status: true, verificationNote: true },
    });
    if (!existing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });

    const updated = await prisma.guideListing.update({
      where: { id },
      data: {
        status,
        verificationNote: note ?? existing.verificationNote,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ADMIN_GUIDE_LISTING_STATUS_UPDATED",
        entity: "GuideListing",
        entityId: updated.id,
        oldData: { status: existing.status, note: existing.verificationNote },
        newData: { status: updated.status, note: updated.verificationNote },
      },
    });

    return NextResponse.json({ listing: updated }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
