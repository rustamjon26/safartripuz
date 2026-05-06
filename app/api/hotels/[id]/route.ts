import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "../_utils";

function firstImageUrl(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((x): x is string => typeof x === "string");
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function starRating(meta: unknown): number {
  if (!meta || typeof meta !== "object") return 4;
  const m = meta as { starRating?: number; stars?: number };
  const n = Number(m.starRating ?? m.stars ?? 4);
  if (Number.isNaN(n) || n < 1) return 4;
  return Math.min(5, Math.round(n));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const hotel = await prisma.hotel.findFirst({
      where: {
        id,
        status: "active",
        partner: { status: "approved", type: "hotel" },
      },
      include: {
        partner: { select: { displayName: true, bio: true, meta: true } },
        roomTypes: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
        },
      },
    });
    if (!hotel) return fail("Mehmonxona topilmadi", 404);

    const gallery: string[] = [];
    for (const rt of hotel.roomTypes) {
      for (const url of firstImageUrl(rt.images)) {
        if (!gallery.includes(url)) gallery.push(url);
      }
    }

    const meta = hotel.partner.meta as { amenities?: string[] } | null;
    const amenities = Array.isArray(meta?.amenities)
      ? meta!.amenities!.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [];

    const reviewStats = await prisma.guestFeedback.aggregate({
      where: { hotelId: hotel.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    return ok({
      id: hotel.id,
      name: hotel.name,
      city: hotel.city ?? "",
      address: hotel.address ?? "",
      description: hotel.partner.bio ?? "",
      stars: starRating(hotel.partner.meta),
      rating: reviewStats._avg.rating ?? null,
      reviewCount: reviewStats._count.id,
      amenities,
      images: gallery,
      roomTypes: hotel.roomTypes.map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        pricePerNight: Number(rt.basePrice),
        capacity: rt.capacityAdults + rt.capacityChildren,
        capacityAdults: rt.capacityAdults,
        capacityChildren: rt.capacityChildren,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
