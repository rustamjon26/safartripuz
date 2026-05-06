import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../_utils";

export async function GET(req: Request) {
  try {
    await requireTaxiAdmin();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      prisma.taxiOrder.findMany({
      where: { status: "DISPUTE" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, first_name: true, last_name: true, phone: true } },
        driver: { select: { id: true, first_name: true, last_name: true, phone: true } },
        service: true,
        vehicle: true,
        logs: {
          where: { toStatus: "DISPUTE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      }),
      prisma.taxiOrder.count({ where: { status: "DISPUTE" } }),
    ]);
    return NextResponse.json({
      data: disputes,
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
