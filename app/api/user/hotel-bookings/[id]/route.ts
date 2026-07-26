import { requireUserWithProfile } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { bookingService, IllegalTransitionError } from "@/src/modules/booking";

function guestMatchWhere(actor: { phone: string | null; first_name: string; last_name: string | null }) {
  const or: Array<Record<string, unknown>> = [];
  if (actor.phone && actor.phone.trim()) {
    or.push({ guestPhone: actor.phone.trim() });
  }
  or.push({
    guests: {
      some: {
        firstName: actor.first_name,
        ...(actor.last_name?.trim()
          ? { lastName: actor.last_name.trim() }
          : {}),
      },
    },
  });
  return { OR: or };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUserWithProfile();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action !== "cancel") {
      return NextResponse.json({ message: "Noto'g'ri amal" }, { status: 400 });
    }

    const booking = await prisma.hotelBooking.findFirst({
      where: {
        id,
        source: "SAFARTRIP",
        ...guestMatchWhere(actor),
      },
      select: { id: true, status: true },
    });
    if (!booking) {
      return NextResponse.json({ message: "Bron topilmadi" }, { status: 404 });
    }

    try {
      const { booking: updated, refund } = await bookingService.cancelWithPolicy(
        booking.id,
        {
          actor: "USER",
          reason: "GUEST_CANCEL",
        },
      );
      return NextResponse.json(
        {
          data: updated,
          refund: {
            refundPercent: refund.refundPercent,
            refundTiyin: refund.refundTiyin.toString(),
            retainedTiyin: refund.retainedTiyin.toString(),
            matchedRuleId: refund.matchedRuleId,
            hoursBeforeCheckIn: refund.hoursBeforeCheckIn,
          },
        },
        { status: 200 },
      );
    } catch (err) {
      if (err instanceof IllegalTransitionError) {
        return NextResponse.json({ message: err.message }, { status: 400 });
      }
      throw err;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
