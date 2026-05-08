import { prisma } from "@/lib/prisma";

const MIN_HOTELS_DISPLAY = 10;
const MIN_GUIDES_DISPLAY = 5;
const MIN_REVIEW_PERCENT_DISPLAY = 95;

type ReviewAggRow = {
  _avg: { rating: number | null };
  _count: { _all: number };
};

const emptyReviewAgg: ReviewAggRow = {
  _avg: { rating: null },
  _count: { _all: 0 },
};

async function safeCount(query: () => Promise<number>): Promise<number> {
  try {
    return await query();
  } catch {
    return 0;
  }
}

async function safeReviewAggregate(
  query: () => Promise<ReviewAggRow>,
): Promise<ReviewAggRow> {
  try {
    return await query();
  } catch {
    return emptyReviewAgg;
  }
}

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
 * Build/SSR: DB mavjud bo‘lmasa ham xavfsiz fallback (0 / bo‘sh aggregate).
 */
export async function getLandingStats(): Promise<LandingStats> {
  const [tourists, hotelsRaw, guidesRaw, guideRev, taxiRev, homeStayRev, guestFb] =
    await Promise.all([
      safeCount(() => prisma.user.count({ where: { role: "user" } })),
      safeCount(() => prisma.hotel.count({ where: { status: "active" } })),
      safeCount(() => prisma.guideListing.count({ where: { status: "ACTIVE" } })),
      safeReviewAggregate(() =>
        prisma.guideReview.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ),
      safeReviewAggregate(() =>
        prisma.taxiReview.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ),
      safeReviewAggregate(() =>
        prisma.homeStayReview.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ),
      safeReviewAggregate(() =>
        prisma.guestFeedback.aggregate({
          _avg: { rating: true },
          _count: { _all: true },
        }),
      ),
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
