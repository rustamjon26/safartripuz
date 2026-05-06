import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "./host/_utils";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const guests = Number(url.searchParams.get("guests") ?? 0);
    const minPrice = Number(url.searchParams.get("minPrice") ?? 0);
    const maxPrice = Number(url.searchParams.get("maxPrice") ?? 0);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);
    const skip = (page - 1) * limit;
    const checkIn = parseDate(url.searchParams.get("checkIn"));
    const checkOut = parseDate(url.searchParams.get("checkOut"));

    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      return fail("checkIn and checkOut must be provided together", 400);
    }
    if (checkIn && checkOut && checkIn >= checkOut) {
      return fail("checkOut must be after checkIn", 400);
    }

    const where: {
      status: "ACTIVE";
      city?: { contains: string };
      maxGuests?: { gte: number };
      pricePerNight?: { gte?: number; lte?: number };
      availabilities?: { none: { startDate: { lt: Date }; endDate: { gt: Date } } };
      bookings?: {
        none: {
          status: { in: ["CONFIRMED", "CHECKED_IN"] };
          checkIn: { lt: Date };
          checkOut: { gt: Date };
        };
      };
    } = { status: "ACTIVE" };

    if (city) where.city = { contains: city };
    if (guests > 0) where.maxGuests = { gte: guests };
    if (minPrice > 0 || maxPrice > 0) {
      where.pricePerNight = {};
      if (minPrice > 0) where.pricePerNight.gte = minPrice;
      if (maxPrice > 0) where.pricePerNight.lte = maxPrice;
    }

    if (checkIn && checkOut) {
      where.availabilities = {
        none: {
          startDate: { lt: checkOut },
          endDate: { gt: checkIn },
        },
      };
      where.bookings = {
        none: {
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.homeStayListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reviews: { select: { rating: true } },
        },
      }),
      prisma.homeStayListing.count({ where }),
    ]);

    const listings = items.map((item) => {
      const reviewCount = item.reviews.length;
      const avgRating =
        reviewCount === 0
          ? null
          : item.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
      return {
        ...item,
        reviewCount,
        avgRating,
        reviews: undefined,
      };
    });

    return ok({
      data: listings,
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
