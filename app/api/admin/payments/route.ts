import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { travelPlanTurTags } from "@/lib/payments/travelPlanBookingTypes";

function travelPlanFilterForTur(tur: string): Prisma.TravelPlanWhereInput | undefined {
  if (tur === "hotel") return { items: { some: { type: "HOTEL" } } };
  if (tur === "homestay") return { homeStayBookings: { some: {} } };
  if (tur === "taxi") {
    return {
      OR: [{ taxiOrders: { some: {} } }, { items: { some: { type: "TAXI" } } }],
    };
  }
  if (tur === "guide") {
    return {
      OR: [{ guideBookings: { some: {} } }, { items: { some: { type: "GUIDE" } } }],
    };
  }
  return undefined;
}

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "";
    const provider = searchParams.get("provider") ?? "";
    const tur = (searchParams.get("tur") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));

    const travelPlanWhere = travelPlanFilterForTur(tur);
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status as Prisma.PaymentWhereInput["status"];
    if (provider) where.provider = provider as Prisma.PaymentWhereInput["provider"];
    if (travelPlanWhere) where.travelPlan = { is: travelPlanWhere };

    const planSelect = {
      destination: true,
      user: { select: { first_name: true, last_name: true, email: true } },
      items: { select: { type: true } },
      _count: {
        select: {
          homeStayBookings: true,
          guideBookings: true,
          taxiOrders: true,
        },
      },
    } satisfies Prisma.TravelPlanSelect;

    const [items, total, stats] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          travelPlan: { select: planSelect },
        },
      }),
      prisma.payment.count({ where }),
      prisma.payment.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const itemsOut = items.map((row) => {
      const plan = row.travelPlan;
      const turTags = plan ? travelPlanTurTags(plan) : [];
      return {
        ...row,
        amount: row.amount.toString(),
        turTags,
        travelPlan: plan
          ? {
              destination: plan.destination,
              user: plan.user,
              turTags,
            }
          : null,
      };
    });

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    return NextResponse.json({ items: itemsOut, total, page, limit, totalPages, stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
