import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import {
  bookingRepository,
  bookingService,
  IllegalTransitionError,
} from "@/src/modules/booking";

const schema = z.object({
  status: z.enum([
    "PENDING",
    "HELD",
    "PAID",
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "NO_SHOW",
    "EXPIRED",
  ]),
});

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

    const booking = await bookingRepository.findByIdAndHotelId(
      id,
      hotelCtx.hotel.id,
    );
    if (!booking) {
      return NextResponse.json({ message: "Booking topilmadi" }, { status: 404 });
    }

    try {
      // Behaviour fix (Step 0 P0): cancel/refund must go through policy + ledger reverse.
      const updated =
        parsed.data.status === "CANCELLED" || parsed.data.status === "REFUNDED"
          ? (
              await bookingService.cancelWithPolicy(booking.id, {
                actor: "PARTNER",
                reason: "HMS_STATUS_PATCH",
                metadata: { actorId: actor.id, requestedStatus: parsed.data.status },
              })
            ).booking
          : await bookingService.transition(booking.id, parsed.data.status, {
              actor: "PARTNER",
              reason: "HMS_STATUS_PATCH",
              metadata: { actorId: actor.id },
              restoreInventory: parsed.data.status === "EXPIRED",
            });

      await bookingRepository.createAuditLog({
        actorId: actor.id,
        action: "HOTEL_BOOKING_STATUS_UPDATED",
        entity: "HotelBooking",
        entityId: updated.id,
        oldData: { status: booking.status },
        newData: { status: updated.status },
      });

      return NextResponse.json({ booking: updated }, { status: 200 });
    } catch (err) {
      if (err instanceof IllegalTransitionError) {
        return NextResponse.json(
          {
            message: `Noto‘g‘ri status transition: ${err.from} -> ${err.to}`,
          },
          { status: 400 },
        );
      }
      throw err;
    }
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
