import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GuideBookingStatus } from "@prisma/client";
import { parseDate, requireGuideAdmin, unauthorizedResponse } from "../_utils";

export async function GET(req: Request) {
  try {
    await requireGuideAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const guideId = (searchParams.get("guideId") ?? "").trim();
    const customerId = (searchParams.get("customerId") ?? "").trim();
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      status?: GuideBookingStatus;
      guideId?: string;
      guestId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {};
    if (status) where.status = status as GuideBookingStatus;
    if (guideId) where.guideId = guideId;
    if (customerId) where.guestId = customerId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }

    const [items, total, aggregates] = await Promise.all([
      prisma.guideBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: { select: { id: true, title: true, category: true, region: true } },
          guide: { select: { id: true, first_name: true, last_name: true, phone: true } },
          guest: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
      }),
      prisma.guideBooking.count({ where }),
      prisma.guideBooking.findMany({
        where,
        select: { status: true, totalPrice: true },
      }),
    ]);

    const statusCounts = aggregates.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const totalRevenue = aggregates.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const pipelineRevenue = aggregates
      .filter((item) => ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.totalPrice), 0);

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
          pipelineRevenue,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
