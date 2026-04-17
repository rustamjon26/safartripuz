import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import type { BookingStatus } from "@prisma/client";

const schema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
});

const transitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const hotelCtx = await getApprovedHotelContextByUserId(actor.id);
    if (!hotelCtx) return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });

    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const booking = await prisma.hotelBooking.findFirst({
      where: { id, hotelId: hotelCtx.hotel.id },
    });
    if (!booking) {
      return NextResponse.json({ message: "Booking topilmadi" }, { status: 404 });
    }

    const allowedNext = transitions[booking.status];
    if (!allowedNext.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          message: `Noto‘g‘ri status transition: ${booking.status} -> ${parsed.data.status}`,
        },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.hotelBooking.update({
        where: { id: booking.id },
        data: { status: parsed.data.status },
      });

      const assignments = await tx.bookingRoomAssignment.findMany({
        where: { bookingId: booking.id, status: "ACTIVE" },
        select: { id: true, physicalRoomId: true },
      });
      const roomIds = assignments.map((a) => a.physicalRoomId);

      if (parsed.data.status === "CHECKED_IN" && roomIds.length) {
        await tx.physicalRoom.updateMany({
          where: { id: { in: roomIds } },
          data: { status: "OCCUPIED" },
        });
      }

      if (parsed.data.status === "CHECKED_OUT" && roomIds.length) {
        await tx.physicalRoom.updateMany({
          where: { id: { in: roomIds } },
          data: { status: "CLEANING" },
        });
      }

      if ((parsed.data.status === "COMPLETED" || parsed.data.status === "CANCELLED" || parsed.data.status === "NO_SHOW") && assignments.length) {
        await tx.bookingRoomAssignment.updateMany({
          where: { bookingId: booking.id, status: "ACTIVE" },
          data: { status: parsed.data.status === "COMPLETED" ? "RELEASED" : "CANCELLED" },
        });
        await tx.physicalRoom.updateMany({
          where: { id: { in: roomIds } },
          data: { status: parsed.data.status === "COMPLETED" ? "CLEANING" : "AVAILABLE" },
        });
      }

      return next;
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "HOTEL_BOOKING_STATUS_UPDATED",
        entity: "HotelBooking",
        entityId: updated.id,
        oldData: { status: booking.status },
        newData: { status: updated.status },
      },
    });

    return NextResponse.json({ booking: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

