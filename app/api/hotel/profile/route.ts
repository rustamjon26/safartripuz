import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
}

export async function PATCH(req: Request) {
  try {
    const { id: userId } = await requireUser();
    const body = await req.json();
    const {
      name,
      city,
      address,
      contactEmail,
      contactPhone,
      latitude,
      longitude,
    } = body as Record<string, unknown>;

    // Find the partner and hotel
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { hotel: { select: { id: true, latitude: true, longitude: true } } },
    });

    if (!partner || !partner.hotel) {
      return NextResponse.json({ message: "Mehmonxona topilmadi" }, { status: 404 });
    }

    // Location is mandatory for new/updated profiles. If the hotel already has
    // coordinates we allow editing without re-sending them (partial updates),
    // but if it has none and the client also didn't supply them, reject.
    const hasExistingCoords =
      partner.hotel.latitude !== null && partner.hotel.longitude !== null;
    const clientSentLat = latitude !== undefined;
    const clientSentLng = longitude !== undefined;

    if (clientSentLat || clientSentLng) {
      if (!isValidLat(latitude) || !isValidLng(longitude)) {
        return NextResponse.json(
          {
            message:
              "Lokatsiya noto'g'ri. Iltimos, xaritadan joyni tanlang (latitude va longitude).",
          },
          { status: 400 },
        );
      }
    } else if (!hasExistingCoords) {
      return NextResponse.json(
        {
          message:
            "Lokatsiya majburiy. Iltimos, xaritadan mehmonxona joyini tanlang.",
        },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (city !== undefined) data.city = city;
    if (address !== undefined) data.address = address;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (clientSentLat) data.latitude = latitude as number;
    if (clientSentLng) data.longitude = longitude as number;

    const hotel = await prisma.hotel.update({
      where: { id: partner.hotel.id },
      data,
    });

    return NextResponse.json({ hotel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
