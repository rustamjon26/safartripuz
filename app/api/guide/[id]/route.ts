import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, ok } from "../_utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const now = new Date();
    const nextTwoMonths = new Date(now);
    nextTwoMonths.setMonth(nextTwoMonths.getMonth() + 2);

    const listing = await prisma.guideListing.findFirst({
      where: { id, status: "ACTIVE" },
      include: {
        host: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            guest: {
              select: { first_name: true, last_name: true },
            },
          },
        },
        availabilities: {
          where: { guideId: { not: "" } },
          orderBy: { dayOfWeek: "asc" },
        },
        blockedSlots: {
          where: {
            date: { gte: now, lte: nextTwoMonths },
          },
          select: {
            date: true,
          },
          orderBy: { date: "asc" },
        },
      },
    });
    if (!listing) return fail(GUIDE_ERRORS.LISTING_NOT_ACTIVE, 404);

    const profile = await prisma.partner.findFirst({
      where: {
        userId: listing.hostId,
        type: "guide",
        status: "approved",
      },
      select: {
        meta: true,
      },
    });

    const languages = Array.isArray((profile?.meta as { languages?: unknown } | null)?.languages)
      ? ((profile?.meta as { languages?: string[] })?.languages ?? [])
      : listing.languages;

    return ok({
      ...listing,
      guide: {
        id: listing.host.id,
        name: `${listing.host.first_name} ${listing.host.last_name}`.trim(),
        avatar: null,
        languages,
        rating: listing.rating,
        totalBookings: listing.totalBookings,
      },
      blockedSlots: listing.blockedSlots.map((slot) => ({
        date: slot.date,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
