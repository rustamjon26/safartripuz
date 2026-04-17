import { prisma } from "@/lib/prisma";
import { handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../_utils";
import type { DriverEarningStatus } from "@prisma/client";

function monthRange(month: string) {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const mon = Number(monthRaw);
  if (!year || !mon || mon < 1 || mon > 12) return null;
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 1);
  return { from, to };
}

export async function GET(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    const where: {
      driverId: string;
      status?: DriverEarningStatus;
      createdAt?: { gte?: Date; lt?: Date };
    } = { driverId: actor.id };

    if (status && status !== "ALL") where.status = status as DriverEarningStatus;
    if (month) {
      const range = monthRange(month);
      if (range) where.createdAt = { gte: range.from, lt: range.to };
    }

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const [items, total, aggregate] = await Promise.all([
      prisma.driverEarning.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            status: true,
            createdAt: true,
          },
        },
      },
      }),
      prisma.driverEarning.count({ where }),
      prisma.driverEarning.aggregate({
        where,
        _sum: {
          grossAmount: true,
          platformFee: true,
          netAmount: true,
        },
      }),
    ]);

    const summary = {
      totalGross: Number(aggregate._sum.grossAmount ?? 0),
      totalFee: Number(aggregate._sum.platformFee ?? 0),
      totalNet: Number(aggregate._sum.netAmount ?? 0),
    };

    return ok({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
