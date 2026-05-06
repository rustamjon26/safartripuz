import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GuideBookingStatus } from "@prisma/client";
import { requireGuideAdmin, unauthorizedResponse } from "../../_utils";

type PatchInput = {
  status?: GuideBookingStatus;
  reason?: string;
  resolution?: "REFUND" | "RELEASE" | "SPLIT";
  note?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuideAdmin();
    const { id } = await params;
    const booking = await prisma.guideBooking.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            host: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
          },
        },
        guide: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
        guest: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
        travelPlan: true,
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
    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    return NextResponse.json({ booking }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireGuideAdmin();
    const { id } = await params;
    const body = (await req.json()) as PatchInput;

    const existing = await prisma.guideBooking.findUnique({
      where: { id },
      select: { id: true, status: true, guideNote: true },
    });
    if (!existing) return NextResponse.json({ message: "Booking not found" }, { status: 404 });

    if (body.resolution) {
      if (existing.status !== "DISPUTE") {
        return NextResponse.json({ message: "Booking is not in dispute" }, { status: 400 });
      }
      const nextStatus: GuideBookingStatus = body.resolution === "RELEASE" ? "COMPLETED" : "CANCELLED";
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.guideBooking.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            cancellationReason:
              nextStatus === "CANCELLED" ? (body.note ?? "Resolved by admin") : null,
            guideNote: body.note ?? existing.guideNote,
          },
        });

        await tx.guideBookingLog.create({
          data: {
            bookingId: next.id,
            actorId: actor.id,
            actorRole: "admin",
            fromStatus: existing.status,
            toStatus: nextStatus,
            note: `${body.resolution}${body.note ? `: ${body.note}` : ""}`,
          },
        });

        return next;
      });

      return NextResponse.json({ booking: updated }, { status: 200 });
    }

    if (!body.status) return NextResponse.json({ message: "status is required" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.guideBooking.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          guideNote: body.reason ?? existing.guideNote,
        },
      });

      await tx.guideBookingLog.create({
        data: {
          bookingId: next.id,
          actorId: actor.id,
          actorRole: "admin",
          fromStatus: existing.status,
          toStatus: body.status as string,
          note: body.reason ?? null,
        },
      });

      return next;
    });

    return NextResponse.json({ booking: updated }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
