import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import type { HomeStayBookingStatus } from "@prisma/client";

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const listingId = (searchParams.get("listingId") ?? "").trim();
    const guestId = (searchParams.get("guestId") ?? "").trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      status?: HomeStayBookingStatus;
      listingId?: string;
      guestId?: string;
      checkIn?: { gte?: Date };
      checkOut?: { lte?: Date };
    } = {};
    if (status) where.status = status as HomeStayBookingStatus;
    if (listingId) where.listingId = listingId;
    if (guestId) where.guestId = guestId;
    if (from) where.checkIn = { ...(where.checkIn || {}), gte: from };
    if (to) where.checkOut = { ...(where.checkOut || {}), lte: to };

    const [items, total, allFiltered] = await Promise.all([
      prisma.homeStayBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: { select: { id: true, title: true, city: true } },
          guest: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
      }),
      prisma.homeStayBooking.count({ where }),
      prisma.homeStayBooking.findMany({
        where,
        select: { status: true, totalPrice: true },
      }),
    ]);

    const statusCounts = allFiltered.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});
    const totalRevenue = allFiltered.reduce((sum, booking) => sum + Number(booking.totalPrice), 0);

    return NextResponse.json(
      {
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
        totals: { byStatus: statusCounts, totalRevenue },
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
