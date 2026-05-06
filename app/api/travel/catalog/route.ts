import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const destinations = [
    { id: "samarkand", title: "Samarqand" },
    { id: "bukhara", title: "Buxoro" },
    { id: "khiva", title: "Xiva" },
    { id: "tashkent", title: "Toshkent" },
    { id: "jizzax", title: "Jizzax" },
    { id: "zomin", title: "Zomin" },
  ];

  const hotelsFromDb = await prisma.hotel.findMany({
    where: {
      partner: {
        status: "approved",
        type: "hotel",
      },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, city: true, totalRooms: true },
  });

  const hotels = hotelsFromDb.map((h, i) => ({
    id: h.id,
    title: h.name,
    city: h.city ?? "Unknown",
    availableRooms: h.totalRooms,
    nightlyPrice: 320000 + i * 30000,
  }));

  const [taxiFromDb, guidesFromDb] = await Promise.all([
    prisma.taxiService.findMany({
      where: {
        isActive: true,
        partner: { status: "approved", type: "taxi" },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { partner: true },
    }),
    prisma.guideListing.findMany({
      where: {
        isActive: true,
        partner: { status: "approved", type: "guide" },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { partner: true },
    }),
  ]);

  const taxiOptions = taxiFromDb.map((t) => ({
    id: t.id,
    title: t.partner.displayName ? `${t.title} • ${t.partner.displayName}` : t.title,
    type: t.serviceType,
    price: Number(t.price),
  }));

  const guides = guidesFromDb.map((g) => ({
    id: g.id,
    title: g.partner.displayName ? `${g.title} • ${g.partner.displayName}` : g.title,
    language: g.language,
    region: g.region ?? "",
    pricePerHour: Number(g.pricePerHour),
    pricePerDay: Number(g.pricePerDay),
  }));

  return NextResponse.json({
    destinations,
    hotels,
    taxiOptions,
    guides,
  });
}

