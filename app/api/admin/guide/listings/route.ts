import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GuideCategory, GuideListingStatus } from "@prisma/client";
import { requireGuideAdmin, unauthorizedResponse } from "../_utils";

export async function GET(req: Request) {
  try {
    await requireGuideAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const category = searchParams.get("category") ?? "";
    const guideId = (searchParams.get("guideId") ?? "").trim();
    const city = (searchParams.get("city") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      status?: GuideListingStatus;
      category?: GuideCategory;
      hostId?: string;
      region?: { contains: string; mode: "insensitive" };
    } = {};
    if (status) where.status = status as GuideListingStatus;
    if (category) where.category = category as GuideCategory;
    if (guideId) where.hostId = guideId;
    if (city) where.region = { contains: city, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.guideListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          host: { select: { id: true, first_name: true, last_name: true } },
          _count: { select: { bookings: true } },
          bookings: {
            where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
            select: { totalPrice: true },
          },
        },
      }),
      prisma.guideListing.count({ where }),
    ]);

    const data = items.map((listing) => ({
      ...listing,
      guideName: `${listing.host.first_name} ${listing.host.last_name}`.trim(),
      bookingCount: listing._count.bookings,
      revenue: listing.bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      host: undefined,
      _count: undefined,
      bookings: undefined,
    }));

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
