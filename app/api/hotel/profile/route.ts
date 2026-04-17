import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function PATCH(req: Request) {
  try {
    const { id: userId } = await requireUser();
    const body = await req.json();
    const { name, city, address, contactEmail, contactPhone } = body;

    // Find the partner and hotel
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true } } },
    });

    if (!partner || !partner.hotel) {
      return NextResponse.json({ message: "Mehmonxona topilmadi" }, { status: 404 });
    }

    const hotel = await prisma.hotel.update({
      where: { id: partner.hotel.id },
      data: {
        name,
        city,
        address,
        contactEmail,
        contactPhone,
      },
    });

    return NextResponse.json({ hotel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
