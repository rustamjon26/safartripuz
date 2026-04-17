import { fail, handleApiError, ok } from "../host/_utils";
import { prisma } from "@/lib/prisma";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const now = new Date();
    const nextThreeMonths = new Date(now);
    nextThreeMonths.setMonth(nextThreeMonths.getMonth() + 3);

    const listing = await prisma.homeStayListing.findFirst({
      where: {
        id,
        status: "ACTIVE",
      },
      include: {
        host: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            guest: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        availabilities: {
          where: {
            startDate: { gte: now },
            endDate: { lte: nextThreeMonths },
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!listing) return fail(HOMESTAY_ERRORS.LISTING_NOT_ACTIVE, 404);

    const reviewStats = await prisma.homeStayReview.aggregate({
      where: { listingId: listing.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    const data = {
      ...listing,
      host: {
        name: `${listing.host.first_name} ${listing.host.last_name}`.trim(),
        avatar: null,
      },
      avgRating: reviewStats._avg.rating ?? null,
      reviewCount: reviewStats._count.id,
    };

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
