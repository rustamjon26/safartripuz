import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const actor = await requireUser();
    const bookings = await prisma.hotelBooking.findMany({
      where: {
        source: "SAFARTRIP",
        userId: actor.id,
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
