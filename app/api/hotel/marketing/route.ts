import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { feedbackService } from "@/src/modules/feedback";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const feedbacks = await prisma.guestFeedback.findMany({
      where: { hotelId: ctx.hotel.id },
      orderBy: { createdAt: "desc" },
    });

    const allBookings = await prisma.hotelBooking.findMany({
      where: { hotelId: ctx.hotel.id, status: "COMPLETED" },
      select: { guestName: true, guestPhone: true },
    });

    const guestStays: Record<string, number> = {};
    allBookings.forEach((b) => {
      const key = b.guestPhone || b.guestName;
      guestStays[key] = (guestStays[key] || 0) + 1;
    });

    const loyalty = {
      platinum: 0,
      gold: 0,
      silver: 0,
    };

    Object.values(guestStays).forEach((count) => {
      if (count >= 5) loyalty.platinum++;
      else if (count >= 2) loyalty.gold++;
      else loyalty.silver++;
    });

    const metrics = {
      avgRating:
        feedbacks.length > 0
          ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length
          : 0,
      totalFeedbacks: feedbacks.length,
      promoterRate:
        feedbacks.length > 0
          ? (feedbacks.filter((f) => f.rating >= 4).length / feedbacks.length) * 100
          : 0,
      loyalty,
    };

    return NextResponse.json({ feedbacks, metrics }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = (await req.json()) as {
      guestName?: string;
      rating?: number;
      comment?: string;
      source?: string;
    };
    const rating = Number(json.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "rating 1–5 bo‘lishi kerak" }, { status: 400 });
    }

    const fb = await prisma.guestFeedback.create({
      data: {
        hotelId: ctx.hotel.id,
        guestName: String(json.guestName ?? ""),
        rating,
        comment: json.comment ?? null,
        source: json.source || "DIRECT",
      },
    });

    void feedbackService.ingestSafe({
      channel: "hotel",
      sourceType: "GuestFeedback",
      sourceId: fb.id,
      authorUserId: null,
      authorName: fb.guestName || "Mehmon",
      rating: fb.rating,
      body: fb.comment ?? `(Reyting: ${fb.rating})`,
      serviceLabel: ctx.hotel.name,
      subjectId: ctx.hotel.id,
      createdAt: fb.createdAt,
    });

    return NextResponse.json({ feedback: fb }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
