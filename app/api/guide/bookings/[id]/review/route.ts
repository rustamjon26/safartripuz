import { getActorSnapshot, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { feedbackService } from "@/src/modules/feedback";
import { fail, handleApiError, ok } from "../../../_utils";

type ReviewInput = {
  rating?: number;
  comment?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const body = (await req.json()) as ReviewInput;
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return fail("rating 1 dan 5 gacha bo'lishi kerak", 400);
    }

    const booking = await prisma.guideBooking.findFirst({
      where: { id, guestId: actor.id },
      select: {
        id: true,
        status: true,
        listingId: true,
        guideId: true,
        listing: { select: { title: true } },
      },
    });
    if (!booking) return fail(GUIDE_ERRORS.BOOKING_NOT_FOUND, 404);
    if (booking.status !== "COMPLETED") {
      return fail("Faqat COMPLETED booking uchun review qoldiriladi", 400);
    }

    const existing = await prisma.guideReview.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (existing) return fail(GUIDE_ERRORS.REVIEW_ALREADY_EXISTS, 409);

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.guideReview.create({
        data: {
          bookingId: booking.id,
          guestId: actor.id,
          guideId: booking.guideId,
          listingId: booking.listingId,
          rating: body.rating as number,
          comment: body.comment ?? null,
        },
      });

      const stats = await tx.guideReview.aggregate({
        where: { listingId: booking.listingId },
        _avg: { rating: true },
      });
      await tx.guideListing.update({
        where: { id: booking.listingId },
        data: { rating: stats._avg.rating ?? 5 },
      });

      return created;
    });

    const actorProfile = await getActorSnapshot(actor.id);
    const authorName = actorProfile
      ? `${actorProfile.first_name}${actorProfile.last_name ? ` ${actorProfile.last_name}` : ""}`.trim()
      : "Mehmon";
    void feedbackService.ingestSafe({
      channel: "guide",
      sourceType: "GuideReview",
      sourceId: review.id,
      authorUserId: actor.id,
      authorName,
      rating: review.rating,
      body: review.comment ?? `(Reyting: ${review.rating})`,
      serviceLabel: booking.listing.title,
      subjectId: booking.listingId,
      createdAt: review.createdAt,
    });

    return ok(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
