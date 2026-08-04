import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HotelStatus, PartnerStatus, PartnerType, type Prisma } from "@prisma/client";
import {
  cityContainsAny,
  cityOrRegionContainsAny,
  destinationSearchTerms,
} from "@/lib/trip-builder/destinationAliases";

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
      }
    } catch {
      /* ignore */
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const destRaw = searchParams.get("dest");
  const destTerms = destinationSearchTerms(destRaw);

  const approvedHotelPartner = {
    status: PartnerStatus.approved,
    type: PartnerType.hotel,
  };
  const approvedGuidePartner = {
    status: PartnerStatus.approved,
    type: PartnerType.guide,
  };
  const approvedTaxiPartner = {
    status: PartnerStatus.approved,
    type: PartnerType.taxi,
  };

  const hotelWhere: Prisma.HotelWhereInput = {
    status: HotelStatus.active,
    partner: approvedHotelPartner,
    ...(destTerms.length ? { OR: cityContainsAny(destTerms) } : {}),
  };

  const guideWhere: Prisma.GuideListingWhereInput = {
    isActive: true,
    partner: approvedGuidePartner,
    ...(destTerms.length
      ? {
          OR: [
            ...destTerms.map((t) => ({ region: { contains: t } })),
            { region: { equals: "" } },
            { region: null },
          ],
        }
      : {}),
  };

  const taxiWhere: Prisma.TaxiServiceWhereInput = {
    isActive: true,
    partner: approvedTaxiPartner,
  };

  const homestayWhere: Prisma.HomeStayListingWhereInput = {
    status: "ACTIVE",
    ...(destTerms.length ? { OR: cityOrRegionContainsAny(destTerms) } : {}),
  };

  const hotelsFromDb = await prisma.hotel.findMany({
    where: hotelWhere,
    take: 30,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      totalRooms: true,
      partner: { select: { meta: true } },
      roomTypes: {
        where: { isActive: true },
        orderBy: { basePrice: "asc" },
        take: 1,
        select: { id: true, basePrice: true, name: true, images: true },
      },
    },
  });

  const hotels = hotelsFromDb
    .filter((h) => h.roomTypes.length > 0)
    .map((h) => {
      const room = h.roomTypes[0];
      const images = parseImages(room.images);
      return {
        id: h.id,
        title: h.name,
        city: h.city ?? "Noma'lum",
        availableRooms: h.totalRooms,
        roomTypeId: room.id,
        roomTypeName: room.name,
        nightlyPrice: Number(room.basePrice),
        images,
        rating: starRating(h.partner?.meta),
      };
    });

  const [taxiFromDb, guidesFromDb, homestaysFromDb] = await Promise.all([
    prisma.taxiService.findMany({
      where: taxiWhere,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { partner: true },
    }),
    prisma.guideListing.findMany({
      where: guideWhere,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { partner: true },
    }),
    prisma.homeStayListing.findMany({
      where: homestayWhere,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { reviews: { select: { rating: true } } },
    }),
  ]);

  const taxis = taxiFromDb.map((t) => ({
    id: t.id,
    title: t.partner?.displayName ? `${t.title} • ${t.partner.displayName}` : t.title,
    type: t.serviceType,
    price: Number(t.price) || 50000,
  }));

  const guides = guidesFromDb.map((g) => ({
    id: g.id,
    title: g.partner?.displayName ? `${g.title} • ${g.partner.displayName}` : g.title,
    language: g.language,
    region: g.region ?? "",
    pricePerHour: Number(g.pricePerHour) || 0,
    pricePerDay: Number(g.pricePerDay) || 200000,
    images: parseImages(g.images),
    avgRating: g.rating,
  }));

  const homestays = homestaysFromDb.map((h) => {
    const reviewCount = h.reviews.length;
    const avgRating =
      reviewCount === 0
        ? undefined
        : h.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
    return {
      id: h.id,
      title: h.title,
      city: h.city,
      region: h.region,
      nightlyPrice: Number(h.pricePerNight),
      maxGuests: h.maxGuests,
      rooms: h.rooms,
      images: parseImages(h.images),
      amenities: parseStringArray(h.amenities),
      avgRating,
      reviewCount,
    };
  });

  return NextResponse.json({
    hotels,
    homestays,
    taxis,
    guides,
  });
}
