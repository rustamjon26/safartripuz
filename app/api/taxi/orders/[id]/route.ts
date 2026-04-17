import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
import { fail, handleApiError, ok } from "../../_utils";

type CancelInput = {
  cancellationReason?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const order = await prisma.taxiOrder.findFirst({
      where: { id, customerId: actor.id },
      include: {
        service: true,
        vehicle: true,
        driver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            driverProfile: {
              select: { rating: true, totalTrips: true, isOnline: true },
            },
            taxiVehicles: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!order) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);

    return ok(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const body = (await req.json()) as CancelInput;

    const existing = await prisma.taxiOrder.findFirst({
      where: { id, customerId: actor.id },
      select: { id: true, status: true },
    });
    if (!existing) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);
    if (!["PENDING", "ACCEPTED"].includes(existing.status)) {
      return fail(TAXI_ERRORS.CANNOT_CANCEL, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledBy: "CUSTOMER",
          cancellationReason: body.cancellationReason ?? "Cancelled by customer",
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: next.id,
          actorId: actor.id,
          actorRole: "customer",
          fromStatus: existing.status,
          toStatus: "CANCELLED",
          note: body.cancellationReason ?? null,
        },
      });

      return next;
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
