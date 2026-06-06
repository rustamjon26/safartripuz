import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PartnerStatus, PartnerType, type Prisma } from "@prisma/client";

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
  const dest = searchParams.get("dest")?.toLowerCase() || "";

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

  const hotelWhere: Prisma.HotelWhereInput = dest
    ? { partner: approvedHotelPartner, city: { contains: dest } }
    : { partner: approvedHotelPartner };

  const guideWhere: Prisma.GuideListingWhereInput = dest
    ? {
        isActive: true,
        partner: approvedGuidePartner,
        OR: [{ region: { contains: dest } }, { region: { equals: "" } }, { region: null }],
      }
    : {
        isActive: true,
        partner: approvedGuidePartner,
      };

  const taxiWhere: Prisma.TaxiServiceWhereInput = {
    isActive: true,
    partner: approvedTaxiPartner,
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

  const [taxiFromDb, guidesFromDb] = await Promise.all([
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

  return NextResponse.json({
    hotels,
    taxis,
    guides,
  });
}
