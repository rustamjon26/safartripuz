import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dest = searchParams.get("dest")?.toLowerCase() || "";

  // Dynamic Filtering based on destination if provided
  const hotelWhere = dest
    ? { partner: { status: "approved" as any, type: "hotel" as any }, city: { contains: dest } }
    : { partner: { status: "approved" as any, type: "hotel" as any } };

  const guideWhere = dest
    ? {
        isActive: true,
        partner: { status: "approved" as any, type: "guide" as any },
        OR: [
          { region: { contains: dest } },
          { region: { equals: "" } },
          { region: null }
        ]
      }
    : {
        isActive: true,
        partner: { status: "approved" as any, type: "guide" as any },
      };

  const taxiWhere = {
    isActive: true,
    partner: { status: "approved" as any, type: "taxi" as any },
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
    nightlyPrice: 280000 + i * 40000, // mock price
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
    pricePerDay: Number(g.pricePerDay) || 200000,
  }));

  return NextResponse.json({
    hotels,
    taxis,
    guides,
  });
}
