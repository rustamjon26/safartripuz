import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
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

    const order = await prisma.taxiOrder.findFirst({
      where: { id, customerId: actor.id },
      select: { id: true, status: true, driverId: true },
    });
    if (!order) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);
    if (order.status !== "COMPLETED") return fail("Faqat COMPLETED order uchun review qoldiriladi", 400);
    if (!order.driverId) return fail("Order driverga biriktirilmagan", 400);

    const existing = await prisma.taxiReview.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    });
    if (existing) return fail(TAXI_ERRORS.REVIEW_ALREADY_EXISTS, 409);

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.taxiReview.create({
        data: {
          orderId: order.id,
          customerId: actor.id,
          driverId: order.driverId as string,
          rating: body.rating as number,
          comment: body.comment ?? null,
        },
      });

      const stats = await tx.taxiReview.aggregate({
        where: { driverId: order.driverId as string },
        _avg: { rating: true },
      });

      await tx.driverProfile.update({
        where: { driverId: order.driverId as string },
        data: { rating: stats._avg.rating ?? 5 },
      });

      return created;
    });

    return ok(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
