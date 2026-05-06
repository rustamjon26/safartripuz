import { requireUserWithProfile } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const actor = await requireUserWithProfile();
    const bookings = await prisma.hotelBooking.findMany({
      where: {
        source: "SAFARTRIP",
        ...guestMatchWhere(actor),
      },
      orderBy: { createdAt: "desc" },
      include: {
        hotel: { select: { id: true, name: true, city: true } },
        roomType: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: bookings }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
