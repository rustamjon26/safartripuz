import { prisma } from "@/lib/prisma";

const MIN_HOTELS_DISPLAY = 10;
const MIN_GUIDES_DISPLAY = 5;
const MIN_REVIEW_PERCENT_DISPLAY = 95;

export type LandingStats = {
  /** Real count — role `user` only */
  tourists: number;
  /** `max(active hotels, MIN_HOTELS_DISPLAY)` */
  hotelsDisplay: number;
  /** `max(ACTIVE guide listings, MIN_GUIDES_DISPLAY)` */
  guidesDisplay: number;
  /** Average rating as % of 5 stars, floored at MIN_REVIEW_PERCENT_DISPLAY */
  reviewPercentDisplay: number;
};

/**
 * Public landing page metrics: DB counts with social-proof floors for new platforms.
 */
export async function getLandingStats(): Promise<LandingStats> {
  const [
    tourists,
    hotelsRaw,
    guidesRaw,
    guideRev,
    taxiRev,
    homeStayRev,
    guestFb,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "user" } }),
    prisma.hotel.count({ where: { status: "active" } }),
    prisma.guideListing.count({ where: { status: "ACTIVE" } }),
    prisma.guideReview.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.taxiReview.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.homeStayReview.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.guestFeedback.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  let sumWeighted = 0;
  let totalReviews = 0;
  for (const agg of [guideRev, taxiRev, homeStayRev, guestFb]) {
    const c = agg._count._all;
    const a = agg._avg.rating;
    if (c > 0 && a != null) {
      sumWeighted += a * c;
      totalReviews += c;
    }
  }

  const avgRating = totalReviews > 0 ? sumWeighted / totalReviews : null;
  const computedPct =
    avgRating != null
      ? Math.round((avgRating / 5) * 100)
      : MIN_REVIEW_PERCENT_DISPLAY;

  return {
    tourists,
    hotelsDisplay: Math.max(hotelsRaw, MIN_HOTELS_DISPLAY),
    guidesDisplay: Math.max(guidesRaw, MIN_GUIDES_DISPLAY),
    reviewPercentDisplay: Math.max(
      computedPct,
      MIN_REVIEW_PERCENT_DISPLAY,
    ),
  };
}
