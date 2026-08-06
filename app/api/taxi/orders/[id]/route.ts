import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { emitToOrder } from "@/lib/socket";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { fail, handleApiError, ok } from "../../_utils";

const cancelOrderSchema = z.object({
  cancellationReason: z.string().trim().min(1).max(500).optional(),
});

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
              select: {
                rating: true,
                totalTrips: true,
                isOnline: true,
                lastLat: true,
                lastLng: true,
                lastLocationAt: true,
              },
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
        review: true,
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

    // `.catch(() => null)` covers a malformed JSON body: it fails the schema
    // and answers 400 instead of throwing into the 500 handler.
    const parsed = cancelOrderSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validatsiya xatosi", 400);
    }
    const body = parsed.data;

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

      if (next.driverId) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: next.id,
          eventType: OutboxEventType.PUSH_DRIVER_ORDER_CANCELLED,
          payload: {
            userId: next.driverId,
            title: "Buyurtma bekor qilindi",
            body: "Mijoz buyurtmani bekor qildi",
            data: { type: "taxi_order_cancelled", orderId: next.id },
            dedupeKey: `push.driver_order_cancelled:${next.id}`,
          },
        });
      }

      return next;
    });

    emitToOrder(updated.id, "order:cancelled", {
      orderId: updated.id,
      status: "CANCELLED",
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
