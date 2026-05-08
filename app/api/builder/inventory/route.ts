import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PartnerStatus, PartnerType, type Prisma } from "@prisma/client";

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
    select: { id: true, name: true, city: true, totalRooms: true },
  });

  const hotels = hotelsFromDb.map((h, i) => ({
    id: h.id,
    title: h.name,
    city: h.city ?? "Noma'lum",
    availableRooms: h.totalRooms,
    nightlyPrice: 280000 + i * 40000,
  }));

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
  }));

  return NextResponse.json({
    hotels,
    taxis,
    guides,
  });
}
