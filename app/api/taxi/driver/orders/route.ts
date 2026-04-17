import { prisma } from "@/lib/prisma";
import { expirePendingTaxiOrders } from "@/lib/taxi/expireOrders";
import { handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../_utils";
import type { TaxiOrderStatus } from "@prisma/client";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    await expirePendingTaxiOrders();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const createdAtFilter: { gte?: Date; lte?: Date } | undefined =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          }
        : undefined;

    const where: {
      OR: Array<{ driverId: string } | { driverId: null; status: "PENDING" }>;
      status?: TaxiOrderStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      OR: [{ driverId: actor.id }, { driverId: null, status: "PENDING" }],
    };

    if (status && status !== "ALL") {
      where.status = status as TaxiOrderStatus;
      if (status !== "PENDING") {
        where.OR = [{ driverId: actor.id }];
      }
    }
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    const [items, total] = await Promise.all([
      prisma.taxiOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, first_name: true, last_name: true, phone: true },
          },
          vehicle: true,
          service: true,
          review: {
            select: { rating: true },
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
