import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emitToOrder } from "@/lib/socket";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
import {
  calcPlatformCommissionTiyin,
  commissionService,
  DEFAULT_COMMISSION_RATES,
} from "@/src/modules/commission";
import { ledgerService } from "@/src/modules/ledger";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { Money } from "@/src/shared/money";
import { fail, handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../../_utils";

const updateOrderSchema = z.object({
  status: z.enum(["ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  vehicleId: z.string().min(1).optional(),
  finalPrice: z.number().positive().finite().max(1_000_000_000).optional(),
  distanceKm: z.number().nonnegative().finite().max(100_000).optional(),
  note: z.string().trim().max(2000).optional(),
  cancellationReason: z.string().trim().max(500).optional(),
});

const allowedTransitions: Record<
  string,
  Array<"ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">
> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTE: [],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;
    const order = await prisma.taxiOrder.findFirst({
      where: { id, driverId: actor.id },
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        estimatedPrice: true,
        finalPrice: true,
        distanceKm: true,
        vehicleId: true,
        customer: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        },
        vehicle: true,
        service: true,
        logs: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { id: true, first_name: true, last_name: true, role: true } } },
        },
        earning: true,
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
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;
    const parsedBody = updateOrderSchema.safeParse(await req.json());
    if (!parsedBody.success) return fail("status majburiy / body noto'g'ri", 400);
    const body = parsedBody.data;

    const existing = await prisma.taxiOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        driverId: true,
        estimatedPrice: true,
      },
    });
    if (!existing) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);

    const targetStatus = body.status;
    if (!allowedTransitions[existing.status]?.includes(targetStatus)) {
      return fail(TAXI_ERRORS.INVALID_STATUS_TRANSITION, 400);
    }

    if (existing.driverId && existing.driverId !== actor.id) {
      return fail(TAXI_ERRORS.ORDER_ALREADY_ASSIGNED, 409);
    }

    if (targetStatus === "ACCEPTED" && !body.vehicleId) {
      return fail(TAXI_ERRORS.NO_ACTIVE_VEHICLE, 400);
    }
    if (targetStatus === "ACCEPTED") {
      const profile = await prisma.driverProfile.findUnique({
        where: { driverId: actor.id },
        select: { isOnline: true },
      });
      if (!profile?.isOnline) return fail(TAXI_ERRORS.DRIVER_OFFLINE, 400);
    }
    if (targetStatus === "COMPLETED" && (typeof body.finalPrice !== "number" || typeof body.distanceKm !== "number")) {
      return fail("COMPLETED uchun finalPrice va distanceKm majburiy", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (targetStatus === "ACCEPTED" && body.vehicleId) {
        const vehicle = await tx.vehicle.findFirst({
          where: { id: body.vehicleId, driverId: actor.id, isActive: true },
          select: { id: true },
        });
        if (!vehicle) throw new Error("INVALID_VEHICLE");
      }

      const updated = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          driverId: existing.driverId ?? actor.id,
          vehicleId: targetStatus === "ACCEPTED" ? body.vehicleId : undefined,
          status: targetStatus,
          driverNote: body.note ?? undefined,
          cancelledBy: targetStatus === "CANCELLED" ? "DRIVER" : undefined,
          cancellationReason: targetStatus === "CANCELLED" ? body.cancellationReason ?? "Driver cancelled" : undefined,
          finalPrice: targetStatus === "COMPLETED" ? body.finalPrice : undefined,
          distanceKm: targetStatus === "COMPLETED" ? body.distanceKm : undefined,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: updated.id,
          actorId: actor.id,
          actorRole: "taxi_partner",
          fromStatus: existing.status,
          toStatus: updated.status,
          note: body.note ?? null,
        },
      });

      if (targetStatus === "COMPLETED") {
        const rates = await commissionService.getRates(tx);
        const taxiRate = rates.TAXI ?? DEFAULT_COMMISSION_RATES.TAXI;
        const grossTiyin = Money.fromSomNumber(body.finalPrice ?? 0).toTiyin();
        const { platformTotal: commissionFee, partnerNet: netAmount } =
          calcPlatformCommissionTiyin(grossTiyin, taxiRate);

        await tx.driverEarning.create({
          data: {
            driverId: actor.id,
            orderId: updated.id,
            grossAmount: Money.fromTiyin(grossTiyin).toSomNumber(),
            platformFee: Money.fromTiyin(commissionFee).toSomNumber(),
            netAmount: Money.fromTiyin(netAmount).toSomNumber(),
            status: "PENDING",
          },
        });

        // General-ledger dual-write — taxi joins the same double-entry SoT as
        // hotel/homestay/guide (idempotent per order).
        await ledgerService.record(
          {
            idempotencyKey: `taxi:order:${updated.id}:completed`,
            bookingId: updated.id,
            bookingType: "TAXI",
            grossTiyin,
            partnerUserId: actor.id,
            payoutOwnerType: "PARTNER",
            ratePercent: taxiRate,
          },
          tx,
        );

        await tx.driverProfile.update({
          where: { driverId: actor.id },
          data: { totalTrips: { increment: 1 } },
        });
      }

      const orderWithUsers = await tx.taxiOrder.findUnique({
        where: { id: updated.id },
        select: {
          customerId: true,
          driverId: true,
          finalPrice: true,
          driver: { select: { first_name: true, last_name: true } },
        },
      });

      const driverName = orderWithUsers?.driver
        ? [orderWithUsers.driver.first_name, orderWithUsers.driver.last_name]
            .filter(Boolean)
            .join(" ")
        : "";

      if (
        targetStatus === "ACCEPTED" &&
        orderWithUsers?.customerId &&
        driverName
      ) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: updated.id,
          eventType: OutboxEventType.PUSH_CUSTOMER_ORDER_ACCEPTED,
          payload: {
            userId: orderWithUsers.customerId,
            title: "Buyurtma qabul qilindi",
            body: `${driverName} buyurtmangizni qabul qildi`,
            data: { type: "taxi_order_accepted", orderId: updated.id },
            dedupeKey: `push.customer_order_accepted:${updated.id}`,
          },
        });
      }
      if (targetStatus === "ARRIVED" && orderWithUsers?.customerId) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: updated.id,
          eventType: OutboxEventType.PUSH_CUSTOMER_DRIVER_ARRIVED,
          payload: {
            userId: orderWithUsers.customerId,
            title: "Haydovchi yetib keldi",
            body: "Haydovchi olib ketish manziliga yetib keldi",
            data: { type: "taxi_driver_arrived", orderId: updated.id },
            dedupeKey: `push.customer_driver_arrived:${updated.id}`,
          },
        });
      }
      if (targetStatus === "IN_PROGRESS" && orderWithUsers?.customerId) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: updated.id,
          eventType: OutboxEventType.PUSH_CUSTOMER_ORDER_STARTED,
          payload: {
            userId: orderWithUsers.customerId,
            title: "Safar boshlandi",
            body: "Safaringiz boshlandi",
            data: { type: "taxi_order_started", orderId: updated.id },
            dedupeKey: `push.customer_order_started:${updated.id}`,
          },
        });
      }
      if (targetStatus === "COMPLETED" && orderWithUsers?.customerId) {
        const finalPrice =
          orderWithUsers.finalPrice != null
            ? Number(orderWithUsers.finalPrice)
            : 0;
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: updated.id,
          eventType: OutboxEventType.PUSH_CUSTOMER_ORDER_COMPLETED,
          payload: {
            userId: orderWithUsers.customerId,
            title: "Safar yakunlandi",
            body: `To'lov summasi: ${finalPrice.toLocaleString("uz-UZ")} so'm`,
            data: {
              type: "taxi_order_completed",
              orderId: updated.id,
              finalPrice,
            },
            dedupeKey: `push.customer_order_completed:${updated.id}`,
          },
        });
      }
      if (targetStatus === "CANCELLED" && orderWithUsers?.customerId) {
        // Driver cancelled — notify customer (driver cancel path)
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: updated.id,
          eventType: OutboxEventType.PUSH_DRIVER_ORDER_CANCELLED,
          payload: {
            userId: orderWithUsers.customerId,
            title: "Buyurtma bekor qilindi",
            body: "Haydovchi buyurtmani bekor qildi",
            data: { type: "taxi_order_cancelled_by_driver", orderId: updated.id },
            dedupeKey: `push.driver_cancelled_notify_customer:${updated.id}`,
          },
        });
      }

      return updated;
    });

    emitToOrder(result.id, "order:status", {
      orderId: result.id,
      status: result.status,
      driverId: result.driverId,
      vehicleId: result.vehicleId,
      updatedAt: result.updatedAt,
    });

    if (targetStatus === "ACCEPTED") {
      emitToOrder(result.id, "order:accepted", {
        orderId: result.id,
        driverId: result.driverId,
      });
    }

    if (targetStatus === "COMPLETED" || targetStatus === "CANCELLED") {
      emitToOrder(result.id, `order:${targetStatus.toLowerCase()}`, {
        orderId: result.id,
        finalPrice: result.finalPrice != null ? Number(result.finalPrice) : null,
        distanceKm: result.distanceKm,
      });
    }

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VEHICLE") {
      return fail(TAXI_ERRORS.NO_ACTIVE_VEHICLE, 400);
    }
    return handleApiError(error);
  }
}
