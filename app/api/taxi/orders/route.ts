import { Prisma, type TaxiOrderStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { emitToDriver } from "@/lib/socket";
import { haversineDistanceKm } from "@/lib/taxi/haversine";
import { OutboxEventType, outboxService } from "@/src/modules/outbox";
import { fail, handleApiError, ok } from "../_utils";

const TAXI_ORDER_STATUSES: TaxiOrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTE",
];

function isTaxiOrderStatus(s: string): s is TaxiOrderStatus {
  return (TAXI_ORDER_STATUSES as string[]).includes(s);
}

const createOrderSchema = z.object({
  pickupAddress: z.string().trim().min(1).max(500),
  pickupLat: z.number().finite().min(-90).max(90),
  pickupLng: z.number().finite().min(-180).max(180),
  dropoffAddress: z.string().trim().min(1).max(500),
  dropoffLat: z.number().finite().min(-90).max(90),
  dropoffLng: z.number().finite().min(-180).max(180),
  serviceId: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
  customerNote: z.string().trim().max(2000).optional(),
  travelPlanId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: { customerId: string; status?: TaxiOrderStatus } = { customerId: actor.id };
    if (status && status !== "ALL" && isTaxiOrderStatus(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.taxiOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          service: true,
          vehicle: true,
          driver: {
            select: { id: true, first_name: true, last_name: true, phone: true },
          },
        },
      }),
      prisma.taxiOrder.count({ where }),
    ]);

    return ok({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const parsed = createOrderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Majburiy maydonlar to'liq emas", 400);
    }
    const body = parsed.data;

    const service = await prisma.taxiService.findFirst({
      where: { id: body.serviceId, isActive: true },
      select: { id: true, price: true, serviceType: true },
    });
    if (!service) return fail("Taxi service topilmadi", 404);

    if (body.travelPlanId) {
      const plan = await prisma.travelPlan.findFirst({
        where: { id: body.travelPlanId, userId: actor.id },
        select: { id: true },
      });
      if (!plan) return fail("Travel plan topilmadi", 404);
    }

    const estimatedDistanceKm = haversineDistanceKm(
      body.pickupLat,
      body.pickupLng,
      body.dropoffLat,
      body.dropoffLng,
    );
    const estimatedPrice = Number((estimatedDistanceKm * Number(service.price)).toFixed(2));
    const priceSnapshot: Prisma.InputJsonValue = {
      serviceId: service.id,
      pricePerKm: Number(service.price),
      estimatedDistanceKm: Number(estimatedDistanceKm.toFixed(2)),
      estimatedAt: new Date().toISOString(),
    };

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.taxiOrder.create({
        data: {
          customerId: actor.id,
          serviceId: body.serviceId!,
          travelPlanId: body.travelPlanId ?? null,
          pickupAddress: body.pickupAddress!,
          dropoffAddress: body.dropoffAddress!,
          pickupLat: body.pickupLat!,
          pickupLng: body.pickupLng!,
          dropoffLat: body.dropoffLat!,
          dropoffLng: body.dropoffLng!,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          estimatedPrice,
          status: "PENDING",
          customerNote: body.customerNote ?? null,
          priceSnapshot,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: order.id,
          actorId: actor.id,
          actorRole: "customer",
          fromStatus: "PENDING",
          toStatus: "PENDING",
          note: "Order created",
        },
      });

      const onlineDrivers = await tx.driverProfile.findMany({
        where: {
          isOnline: true,
          isVerified: true,
          driver: {
            isBlocked: false,
            taxiVehicles: { some: { isActive: true } },
          },
        },
        select: { driverId: true },
      });

      const priceNum =
        order.estimatedPrice != null ? Number(order.estimatedPrice) : 0;
      for (const driver of onlineDrivers) {
        await outboxService.enqueueInTx(tx, {
          aggregateType: "TaxiOrder",
          aggregateId: order.id,
          eventType: OutboxEventType.PUSH_DRIVER_NEW_ORDER,
          payload: {
            userId: driver.driverId,
            title: "Yangi buyurtma",
            body: `${order.pickupAddress} — ${priceNum.toLocaleString("uz-UZ")} so'm`,
            data: {
              type: "taxi_order_new",
              orderId: order.id,
              pickupAddress: order.pickupAddress,
              estimatedPrice: priceNum,
            },
            dedupeKey: `push.driver_new_order:${order.id}:${driver.driverId}`,
          },
        });
      }

      return { order, onlineDrivers };
    });

    for (const driver of created.onlineDrivers) {
      emitToDriver(driver.driverId, "order:new", {
        id: created.order.id,
        pickupAddress: created.order.pickupAddress,
        dropoffAddress: created.order.dropoffAddress,
        estimatedPrice: Number(created.order.estimatedPrice),
        serviceType: service.serviceType,
        createdAt: created.order.createdAt,
      });
    }

    return ok(created.order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
