import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const actor = await requireUser();
    const planId = (await ctx.params).id;

    const plan = await prisma.travelPlan.findUnique({
      where: { id: planId },
      include: {
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Sayohat rejasi topilmadi" }, { status: 404 });
    }

    if (plan.userId !== actor.id) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    if (plan.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Bu buyurtma allaqachon tasdiqlangan" },
        { status: 409 },
      );
    }

    if (plan.status === "CANCELLED") {
      return NextResponse.json({ error: "Bu buyurtma bekor qilingan" }, { status: 410 });
    }

    const successPayment = plan.payments[0] ?? null;

    if (!successPayment) {
      return NextResponse.json(
        {
          error: "To'lov tasdiqlanmagan",
          message: "Avval to'lovni amalga oshiring",
          planStatus: plan.status,
        },
        { status: 402 },
      );
    }

    if (Number(successPayment.amount) < Number(plan.totalAmount)) {
      return NextResponse.json(
        {
          error: "To'lov summasi yetarli emas",
          paid: Number(successPayment.amount),
          required: Number(plan.totalAmount),
        },
        { status: 402 },
      );
    }

    await prisma.$transaction(async (tx) =>
      completeSuccessfulPaymentInTx(tx, {
        paymentId: successPayment.id,
        travelPlanId: plan.id,
        actorId: actor.id,
        previousPaymentStatus: successPayment.status,
      }),
    );

    return NextResponse.json({
      success: true,
      message: "Buyurtma tasdiqlandi",
      planId,
      paymentId: successPayment.id,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Avtorizatsiya talab etiladi" }, { status: 401 });
    }
    console.error("[travel-plans/pay] Error:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
