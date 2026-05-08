import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

type CreateHomestayPayload = {
  title?: string;
  city?: string;
  region?: string;
  address?: string;
  description?: string;
  pricePerNight?: string | number;
  maxGuests?: string | number;
  rooms?: string | number;
  beds?: string | number;
  bathrooms?: string | number;
};

export async function POST(req: Request) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const body = (await req.json()) as CreateHomestayPayload;
    const {
      title,
      city,
      region,
      address,
      description,
      pricePerNight,
      maxGuests,
      rooms,
      beds,
      bathrooms,
    } = body;

    if (!title || !city || !address || !region) {
      return NextResponse.json(
        { message: "Title, shahar, region va manzil majburiy" },
        { status: 400 },
      );
    }

    const listing = await prisma.homeStayListing.create({
      data: {
        title,
        city,
        region: region || city,
        address,
        description: description || "",
        pricePerNight: Number.parseFloat(String(pricePerNight)) || 0,
        maxGuests: Number.parseInt(String(maxGuests), 10) || 2,
        rooms: Number.parseInt(String(rooms), 10) || 1,
        beds: Number.parseInt(String(beds), 10) || 1,
        bathrooms: Number.parseInt(String(bathrooms), 10) || 1,
        amenities: [],
        images: [],
        status: "ACTIVE",
        hostId: user.id,
      },
    });

    return NextResponse.json({ listing });
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
