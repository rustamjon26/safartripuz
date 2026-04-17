import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/taxi/haversine";
import { fail, handleApiError, ok } from "../_utils";

type CreateOrderInput = {
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  serviceId?: string;
  scheduledAt?: string;
  customerNote?: string;
  travelPlanId?: string;
};

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: { customerId: string; status?: string } = { customerId: actor.id };
    if (status && status !== "ALL") where.status = status;

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
    const body = (await req.json()) as CreateOrderInput;
    if (
      !body.pickupAddress ||
      typeof body.pickupLat !== "number" ||
      typeof body.pickupLng !== "number" ||
      !body.dropoffAddress ||
      typeof body.dropoffLat !== "number" ||
      typeof body.dropoffLng !== "number" ||
      !body.serviceId
    ) {
      return fail("Majburiy maydonlar to'liq emas", 400);
    }

    const service = await prisma.taxiService.findFirst({
      where: { id: body.serviceId, isActive: true },
      select: { id: true, price: true },
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
          serviceId: body.serviceId,
          travelPlanId: body.travelPlanId ?? null,
          pickupAddress: body.pickupAddress,
          dropoffAddress: body.dropoffAddress,
          pickupLat: body.pickupLat,
          pickupLng: body.pickupLng,
          dropoffLat: body.dropoffLat,
          dropoffLng: body.dropoffLng,
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

      return order;
    });

    return ok(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
