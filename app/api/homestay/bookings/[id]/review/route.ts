import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import { fail, handleApiError, ok } from "../../../host/_utils";

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
      return fail("rating must be between 1 and 5", 400);
    }

    const booking = await prisma.homeStayBooking.findFirst({
      where: { id, guestId: actor.id },
      select: {
        id: true,
        status: true,
        listingId: true,
      },
    });

    if (!booking) return fail(HOMESTAY_ERRORS.BOOKING_NOT_FOUND, 404);
    if (booking.status !== "COMPLETED") {
      return fail("Review can only be submitted for COMPLETED booking", 400);
    }

    const existingReview = await prisma.homeStayReview.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (existingReview) return fail(HOMESTAY_ERRORS.REVIEW_ALREADY_EXISTS, 409);

    const review = await prisma.homeStayReview.create({
      data: {
        bookingId: booking.id,
        guestId: actor.id,
        listingId: booking.listingId,
        rating: body.rating,
        comment: body.comment ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "HOMESTAY_REVIEW_CREATED",
        entity: "HomeStayReview",
        entityId: review.id,
        newData: {
          bookingId: booking.id,
          listingId: booking.listingId,
          rating: review.rating,
        },
      },
    });

    return ok(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
