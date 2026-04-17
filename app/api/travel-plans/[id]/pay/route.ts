import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const plan = await prisma.travelPlan.findFirst({
      where: { id, userId: actor.id },
      select: { id: true, status: true },
    });
    if (!plan) {
      return NextResponse.json({ message: "Travel plan topilmadi" }, { status: 404 });
    }
    if (plan.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { message: "Faqat PENDING_PAYMENT holatidagi plan to‘lanadi" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.travelPlan.update({
        where: { id: plan.id },
        data: { status: "CONFIRMED" },
        select: { id: true, status: true, totalAmount: true },
      });

      await tx.hotelBooking.updateMany({
        where: {
          note: { contains: plan.id },
          status: "PENDING",
        },
        data: {
          status: "CONFIRMED",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TRAVEL_PLAN_PAID",
          entity: "TravelPlan",
          entityId: next.id,
          newData: { status: next.status, totalAmount: next.totalAmount },
        },
      });

      return next;
    });

    return NextResponse.json({ plan: updated }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

