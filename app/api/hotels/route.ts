import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "./_utils";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstImageUrl(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images) as unknown;
      if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    } catch {
      return null;
    }
  }
  return null;
}

function starRating(meta: unknown): number {
  if (!meta || typeof meta !== "object") return 4;
  const m = meta as { starRating?: number; stars?: number };
  const n = Number(m.starRating ?? m.stars ?? 4);
  if (Number.isNaN(n) || n < 1) return 4;
  return Math.min(5, Math.round(n));
}

async function availableRoomCount(
  hotelId: string,
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<number> {
  const total = await prisma.physicalRoom.count({
    where: { hotelId, roomTypeId, isActive: true },
  });
  const busy = await prisma.hotelBooking.findMany({
    where: {
      hotelId,
      roomTypeId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      checkInDate: { lt: checkOut },
      checkOutDate: { gt: checkIn },
    },
    select: { roomCount: true },
  });
  const used = busy.reduce((s, b) => s + b.roomCount, 0);
  return Math.max(0, total - used);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const guests = Math.max(Number(url.searchParams.get("guests") ?? 0), 0);
    const minPrice = Number(url.searchParams.get("minPrice") ?? 0);
    const maxPrice = Number(url.searchParams.get("maxPrice") ?? 0);
    const minStars = Number(url.searchParams.get("minStars") ?? 0);
    const maxStars = Number(url.searchParams.get("maxStars") ?? 0);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);
    const skip = (page - 1) * limit;
    const checkIn = parseDate(url.searchParams.get("checkIn"));
    const checkOut = parseDate(url.searchParams.get("checkOut"));

    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      return fail("checkIn va checkOut birga yuborilishi kerak", 400);
    }
    if (checkIn && checkOut && checkIn >= checkOut) {
      return fail("checkOut checkIn dan keyin bo'lishi kerak", 400);
    }

    const hotels = await prisma.hotel.findMany({
      where: {
        status: "active",
        partner: { status: "approved", type: "hotel" },
        ...(city ? { city: { contains: city } } : {}),
      },
      include: {
        partner: { select: { id: true, displayName: true, bio: true, meta: true } },
        roomTypes: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
          select: {
            id: true,
            name: true,
            basePrice: true,
            capacityAdults: true,
            capacityChildren: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = [];
    for (const h of hotels) {
      const stars = starRating(h.partner.meta);
      if (minStars > 0 && stars < minStars) continue;
      if (maxStars > 0 && stars > maxStars) continue;

      const cheapest = h.roomTypes[0];
      if (!cheapest) continue;
      const nightly = Number(cheapest.basePrice);
      if (minPrice > 0 && nightly < minPrice) continue;
      if (maxPrice > 0 && nightly > maxPrice) continue;

      const capacity = h.roomTypes.reduce(
        (m, rt) => Math.max(m, rt.capacityAdults + rt.capacityChildren),
        0,
      );
      if (guests > 0 && capacity < guests) continue;

      let hasAvailability = true;
      if (checkIn && checkOut) {
        hasAvailability = false;
        for (const rt of h.roomTypes) {
          const avail = await availableRoomCount(h.id, rt.id, checkIn, checkOut);
          const cap = rt.capacityAdults + rt.capacityChildren;
          if (avail > 0 && (!guests || cap >= guests)) {
            hasAvailability = true;
            break;
          }
        }
      }
      if (!hasAvailability) continue;

      const cover =
        firstImageUrl(cheapest.images) ??
        h.roomTypes.map((rt) => firstImageUrl(rt.images)).find(Boolean) ??
        null;

      const reviewAgg = await prisma.guestFeedback.aggregate({
        where: { hotelId: h.id },
        _avg: { rating: true },
        _count: { id: true },
      });

      enriched.push({
        id: h.id,
        name: h.name,
        city: h.city ?? "",
        address: h.address,
        stars,
        nightlyPrice: nightly,
        rating: reviewAgg._avg.rating ?? null,
        reviewCount: reviewAgg._count.id,
        imageUrl: cover,
        roomTypesCount: h.roomTypes.length,
      });
    }

    const total = enriched.length;
    const slice = enriched.slice(skip, skip + limit);

    return ok({
      data: slice,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
