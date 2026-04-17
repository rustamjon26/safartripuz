import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { logBookingStatus } from "@/lib/homestay/logBookingStatus";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import type { HomeStayBookingStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const booking = await prisma.homeStayBooking.findUnique({
      where: { id },
      include: {
        listing: { include: { host: { select: { id: true, first_name: true, last_name: true, email: true } } } },
        guest: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
        review: true,
        logs: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: {
              select: { id: true, first_name: true, last_name: true, email: true, role: true },
            },
          },
        },
      },
    });
    if (!booking) return NextResponse.json({ message: HOMESTAY_ERRORS.BOOKING_NOT_FOUND }, { status: 404 });
    return NextResponse.json({ booking }, { status: 200 });
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
    const { status, reason } = body as { status?: HomeStayBookingStatus; reason?: string };
    if (!status) return NextResponse.json({ message: "status is required" }, { status: 400 });

    const existing = await prisma.homeStayBooking.findUnique({
      where: { id },
      select: { id: true, status: true, hostNote: true },
    });
    if (!existing) return NextResponse.json({ message: HOMESTAY_ERRORS.BOOKING_NOT_FOUND }, { status: 404 });

    const updated = await prisma.homeStayBooking.update({
      where: { id },
      data: {
        status,
        hostNote: reason ?? existing.hostNote,
      },
    });

    await logBookingStatus({
      bookingId: updated.id,
      actorId: actor.id,
      actorRole: "admin",
      fromStatus: existing.status,
      toStatus: updated.status,
      note: reason ?? undefined,
    });

    return NextResponse.json({ booking: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
