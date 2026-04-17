import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { HomeStayListingStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const city = (searchParams.get("city") ?? "").trim();
    const hostId = (searchParams.get("hostId") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      status?: HomeStayListingStatus;
      city?: { contains: string; mode: "insensitive" };
      hostId?: string;
    } = {};
    if (status) where.status = status as HomeStayListingStatus;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (hostId) where.hostId = hostId;

    const [items, total] = await Promise.all([
      prisma.homeStayListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          host: { select: { id: true, first_name: true, last_name: true } },
          _count: { select: { bookings: true } },
          bookings: { select: { totalPrice: true } },
        },
      }),
      prisma.homeStayListing.count({ where }),
    ]);

    const data = items.map((listing) => ({
      ...listing,
      hostName: `${listing.host.first_name} ${listing.host.last_name}`.trim(),
      bookingCount: listing._count.bookings,
      revenueSum: listing.bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      bookings: undefined,
      _count: undefined,
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
