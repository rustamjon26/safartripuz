import type { PaymentStatus, TravelPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminTourBookingRow = {
  id: string;
  guestName: string;
  date: string;
  pax: number;
  totalAmount: number;
  status: TravelPlanStatus;
  paymentStatus: PaymentStatus | null;
};

export type AdminTourDetail = {
  tour: {
    id: string;
    title: string;
    description: string;
    destination: string;
    days: number;
    nights: number;
    price: number;
    category: string;
    status: string;
    imageUrl: string | null;
    highlights: string[];
    images: string[];
    createdAt: string;
    updatedAt: string;
  };
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  stats: {
    totalBookings: number;
    confirmed: number;
    cancelled: number;
    totalRevenue: number;
  };
  recentBookings: AdminTourBookingRow[];
};

function parseHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function buildImages(imageUrl: string | null, highlights: unknown): string[] {
  const images: string[] = [];
  if (imageUrl) images.push(imageUrl);
  for (const item of parseHighlights(highlights)) {
    if (/^https?:\/\//i.test(item) && !images.includes(item)) {
      images.push(item);
    }
  }
  return images;
}

export async function getAdminTourDetail(id: string): Promise<AdminTourDetail | null> {
  const tour = await prisma.tourPackage.findUnique({ where: { id } });
  if (!tour) return null;

  const [
    totalBookings,
    confirmed,
    cancelled,
    revenueAgg,
    recentPlans,
    creatorLog,
  ] = await Promise.all([
    prisma.travelPlan.count({ where: { tourPackageId: id } }),
    prisma.travelPlan.count({ where: { tourPackageId: id, status: "CONFIRMED" } }),
    prisma.travelPlan.count({ where: { tourPackageId: id, status: "CANCELLED" } }),
    prisma.travelPlan.aggregate({
      where: { tourPackageId: id, status: "CONFIRMED" },
      _sum: { totalAmount: true },
    }),
    prisma.travelPlan.findMany({
      where: { tourPackageId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { first_name: true, last_name: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        entityId: id,
        entity: { in: ["TourPackage", "Tour"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        actor: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    }),
  ]);

  const highlights = parseHighlights(tour.highlights);

  return {
    tour: {
      id: tour.id,
      title: tour.title,
      description: tour.description,
      destination: tour.destination,
      days: tour.days,
      nights: tour.nights,
      price: Number(tour.price),
      category: tour.category,
      status: tour.status,
      imageUrl: tour.imageUrl,
      highlights,
      images: buildImages(tour.imageUrl, tour.highlights),
      createdAt: tour.createdAt.toISOString(),
      updatedAt: tour.updatedAt.toISOString(),
    },
    creator: creatorLog?.actor ?? null,
    stats: {
      totalBookings,
      confirmed,
      cancelled,
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
    },
    recentBookings: recentPlans.map((plan) => ({
      id: plan.id,
      guestName: `${plan.user.first_name} ${plan.user.last_name}`.trim(),
      date: plan.startDate.toISOString(),
      pax: plan.pax,
      totalAmount: Number(plan.totalAmount),
      status: plan.status,
      paymentStatus: plan.payments[0]?.status ?? null,
    })),
  };
}
