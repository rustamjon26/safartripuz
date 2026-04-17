import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where = { role: "home_stay_partner" as const };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          isBlocked: true,
          createdAt: true,
          homeStayListings: {
            select: {
              id: true,
              bookings: { select: { totalPrice: true } },
              reviews: { select: { rating: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = items.map((user) => {
      const listings = user.homeStayListings;
      const listingCount = listings.length;
      const totalBookingRevenue = listings.reduce(
        (sum, listing) => sum + listing.bookings.reduce((s, b) => s + Number(b.totalPrice), 0),
        0,
      );
      const ratings = listings.flatMap((listing) => listing.reviews.map((r) => r.rating));
      const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
      return {
        ...user,
        listingCount,
        totalBookingRevenue,
        avgRating,
        homeStayListings: undefined,
      };
    });

    return NextResponse.json({ items: data, total, page, limit }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
