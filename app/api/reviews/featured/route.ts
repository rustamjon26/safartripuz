import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FEATURED_REVIEWS_FALLBACK,
  type FeaturedReview,
} from "@/lib/featuredReviewsFallback";

function formatReviewMonthYear(d: Date): string {
  try {
    return new Intl.DateTimeFormat("uz-UZ", {
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

function destFromGuideListing(region: string | null, title: string): string {
  const r = region?.trim();
  if (r) return `🏔️ ${r}`;
  return `🧭 ${title}`;
}

export async function GET() {
  try {
    const [guideRows, taxiRows, homeRows] = await Promise.all([
      prisma.guideReview.findMany({
        where: { rating: 5 },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          guest: { select: { first_name: true } },
          listing: { select: { region: true, title: true } },
        },
      }),
      prisma.taxiReview.findMany({
        where: { rating: 5 },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          customer: { select: { first_name: true } },
          order: { select: { dropoffAddress: true } },
        },
      }),
      prisma.homeStayReview.findMany({
        where: { rating: 5 },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          guest: { select: { first_name: true } },
          listing: { select: { city: true, title: true } },
        },
      }),
    ]);

    type Row = { at: number; item: FeaturedReview };
    const pool: Row[] = [];

    for (const r of guideRows) {
      const name = r.guest?.first_name?.trim() || "Mehmon";
      pool.push({
        at: r.createdAt.getTime(),
        item: {
          id: `g-${r.id}`,
          author: name,
          text: r.comment?.trim() || "Ajoyib tajriba!",
          destination: destFromGuideListing(r.listing.region, r.listing.title),
          date: formatReviewMonthYear(r.createdAt),
        },
      });
    }

    for (const r of taxiRows) {
      const name = r.customer?.first_name?.trim() || "Mehmon";
      const drop = r.order.dropoffAddress?.trim() || "Manzil";
      pool.push({
        at: r.createdAt.getTime(),
        item: {
          id: `t-${r.id}`,
          author: name,
          text: r.comment?.trim() || "Zo'r haydovchi va qulay sayohat!",
          destination: `🚖 ${drop.length > 42 ? `${drop.slice(0, 39)}…` : drop}`,
          date: formatReviewMonthYear(r.createdAt),
        },
      });
    }

    for (const r of homeRows) {
      const name = r.guest?.first_name?.trim() || "Mehmon";
      const city = r.listing.city?.trim() || r.listing.title;
      pool.push({
        at: r.createdAt.getTime(),
        item: {
          id: `h-${r.id}`,
          author: name,
          text: r.comment?.trim() || "Uy mehmonxonasi juda yoqimli edi!",
          destination: `🏠 ${city}`,
          date: formatReviewMonthYear(r.createdAt),
        },
      });
    }

    pool.sort((a, b) => b.at - a.at);
    const picked: FeaturedReview[] = [];
    const seenText = new Set<string>();
    for (const { item } of pool) {
      if (picked.length >= 3) break;
      const key = `${item.author}|${item.text.slice(0, 48)}`;
      if (seenText.has(key)) continue;
      seenText.add(key);
      picked.push(item);
    }

    if (picked.length < 3) {
      for (const f of FEATURED_REVIEWS_FALLBACK) {
        if (picked.length >= 3) break;
        if (picked.some((p) => p.id === f.id)) continue;
        picked.push({ ...f });
      }
    }

    return NextResponse.json({ reviews: picked.slice(0, 3) });
  } catch (e) {
    console.error("featured reviews:", e);
    return NextResponse.json({
      reviews: FEATURED_REVIEWS_FALLBACK.slice(0, 3),
    });
  }
}
