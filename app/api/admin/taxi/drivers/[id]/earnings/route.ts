import { NextResponse } from "next/server";
import type { DriverEarningStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../../../_utils";

type SettleInput = {
  earningIds?: string[];
};

function parseMonth(month: string | null) {
  if (!month) return null;
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const m = Number(monthRaw);
  if (!year || !m || m < 1 || m > 12) return null;
  return {
    from: new Date(year, m - 1, 1),
    to: new Date(year, m, 1),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTaxiAdmin();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const month = parseMonth(searchParams.get("month"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      driverId: string;
      status?: DriverEarningStatus;
      createdAt?: { gte?: Date; lt?: Date };
    } = { driverId: id };
    if (status && status !== "ALL" && (status === "PENDING" || status === "SETTLED")) {
      where.status = status as DriverEarningStatus;
    }
    if (month) where.createdAt = { gte: month.from, lt: month.to };

    const [items, total] = await Promise.all([
      prisma.driverEarning.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            pickupAddress: true,
            dropoffAddress: true,
            createdAt: true,
          },
        },
      },
      }),
      prisma.driverEarning.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTaxiAdmin();
    const { id } = await params;
    const body = (await req.json()) as SettleInput;
    if (!Array.isArray(body.earningIds) || body.earningIds.length === 0) {
      return NextResponse.json({ message: "earningIds is required" }, { status: 400 });
    }

    await prisma.driverEarning.updateMany({
      where: {
        driverId: id,
        id: { in: body.earningIds },
      },
      data: {
        status: "SETTLED",
        settledAt: new Date(),
      },
    });

    const settled = await prisma.driverEarning.findMany({
      where: { driverId: id, id: { in: body.earningIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: settled }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
