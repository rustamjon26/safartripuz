import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { feedbackService } from "@/src/modules/feedback";
import { marketingService } from "@/src/modules/marketing";

/** `rating` is coerced because the form sends it as a string. */
const guestFeedbackSchema = z.object({
  guestName: z.string().trim().max(191).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  source: z.string().trim().min(1).max(64).optional(),
});

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

    const { promos, activeCount } = await marketingService.listPromos(ctx.hotel.id);

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
      activePromos: activeCount,
    };

    return NextResponse.json({ feedbacks, metrics, promos }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const parsed = guestFeedbackSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi" },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const fb = await prisma.guestFeedback.create({
      data: {
        hotelId: ctx.hotel.id,
        guestName: body.guestName ?? "",
        rating: body.rating,
        comment: body.comment ?? null,
        source: body.source ?? "DIRECT",
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
