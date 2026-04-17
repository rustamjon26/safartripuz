import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const feedbacks = await (prisma as any).guestFeedback.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { createdAt: "desc" },
    });

    // Calculate real loyalty tiers based on booking history
    const allBookings = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id, status: "COMPLETED" },
      select: { guestName: true, guestPhone: true }
    });

    const guestStays: Record<string, number> = {};
    allBookings.forEach(b => {
      const key = b.guestPhone || b.guestName;
      guestStays[key] = (guestStays[key] || 0) + 1;
    });

    const loyalty = {
      platinum: 0,
      gold: 0,
      silver: 0
    };

    Object.values(guestStays).forEach(count => {
      if (count >= 5) loyalty.platinum++;
      else if (count >= 2) loyalty.gold++;
      else loyalty.silver++;
    });

    const metrics = {
      avgRating: feedbacks.length > 0 ? feedbacks.reduce((acc: number, f: any) => acc + f.rating, 0) / feedbacks.length : 0,
      totalFeedbacks: feedbacks.length,
      promoterRate: feedbacks.length > 0 ? (feedbacks.filter((f: any) => f.rating >= 4).length / feedbacks.length) * 100 : 0,
      loyalty
    };

    return NextResponse.json({ feedbacks, metrics }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const fb = await (prisma as any).guestFeedback.create({
      data: {
        hotelId: ctx.hotel.id,
        guestName: json.guestName,
        rating: Number(json.rating),
        comment: json.comment,
        source: json.source || "DIRECT",
      },
    });

    return NextResponse.json({ feedback: fb }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
