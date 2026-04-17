import { prisma } from "@/lib/prisma";
import { handleApiError, ok } from "./_utils";
import type { GuideCategory } from "@prisma/client";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const category = url.searchParams.get("category") as GuideCategory | null;
    const language = url.searchParams.get("language");
    const date = parseDate(url.searchParams.get("date"));
    const minPrice = Number(url.searchParams.get("minPrice") ?? 0);
    const maxPrice = Number(url.searchParams.get("maxPrice") ?? 0);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);
    const skip = (page - 1) * limit;

    const where: {
      status: "ACTIVE";
      region?: { contains: string; mode: "insensitive" };
      category?: GuideCategory;
      languages?: { has: string };
      pricePerHour?: { gte?: number; lte?: number };
      blockedSlots?: { none: { date: { gte: Date; lte: Date }; startTime: null; endTime: null } };
      availabilities?: { some: { dayOfWeek: number; isAvailable: boolean } };
    } = { status: "ACTIVE" };

    if (city) where.region = { contains: city, mode: "insensitive" };
    if (category) where.category = category;
    if (language) where.languages = { has: language };
    if (minPrice > 0 || maxPrice > 0) {
      where.pricePerHour = {};
      if (minPrice > 0) where.pricePerHour.gte = minPrice;
      if (maxPrice > 0) where.pricePerHour.lte = maxPrice;
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const dayOfWeek = date.getDay();
      where.blockedSlots = {
        none: {
          date: { gte: dayStart, lte: dayEnd },
          startTime: null,
          endTime: null,
        },
      };
      where.availabilities = {
        some: {
          dayOfWeek,
          isAvailable: true,
        },
      };
    }

    const [items, total] = await Promise.all([
      prisma.guideListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reviews: { select: { rating: true } },
        },
      }),
      prisma.guideListing.count({ where }),
    ]);

    const data = items.map((item) => {
      const reviewCount = item.reviews.length;
      const avgRating =
        reviewCount === 0
          ? null
          : item.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
      return {
        ...item,
        avgRating,
        reviewCount,
        reviews: undefined,
      };
    });

    return ok({
      data,
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
