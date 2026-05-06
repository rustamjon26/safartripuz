import { NextResponse } from "next/server";
import type { TaxiOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDate, requireTaxiAdmin, unauthorizedResponse } from "../_utils";

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

export async function GET(req: Request) {
  try {
    await requireTaxiAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const driverId = (searchParams.get("driverId") ?? "").trim();
    const customerId = (searchParams.get("customerId") ?? "").trim();
    const serviceId = (searchParams.get("serviceId") ?? "").trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      status?: TaxiOrderStatus;
      driverId?: string;
      customerId?: string;
      serviceId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (status && isTaxiOrderStatus(status)) where.status = status;
    if (driverId) where.driverId = driverId;
    if (customerId) where.customerId = customerId;
    if (serviceId) where.serviceId = serviceId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [items, total, aggregates] = await Promise.all([
      prisma.taxiOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, first_name: true, last_name: true, phone: true } },
          driver: { select: { id: true, first_name: true, last_name: true, phone: true } },
          service: true,
          vehicle: true,
        },
      }),
      prisma.taxiOrder.count({ where }),
      prisma.taxiOrder.findMany({
        where,
        select: { status: true, finalPrice: true, estimatedPrice: true },
      }),
    ]);

    const statusCounts = aggregates.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const totalRevenue = aggregates.reduce((sum, item) => {
      const amount = item.finalPrice ?? item.estimatedPrice;
      return sum + Number(amount);
    }, 0);
    const completedRevenue = aggregates
      .filter((item) => item.status === "COMPLETED")
      .reduce((sum, item) => sum + Number(item.finalPrice ?? item.estimatedPrice), 0);

    return NextResponse.json(
      {
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
        totals: {
          byStatus: statusCounts,
          totalRevenue,
          completedRevenue,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
