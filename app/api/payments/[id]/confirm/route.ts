import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { travelPlan: { select: { id: true, userId: true, status: true } } },
    });
    if (!payment || payment.travelPlan.userId !== actor.id) {
      return NextResponse.json({ message: "Payment topilmadi" }, { status: 404 });
    }
    if (payment.status !== "PENDING" && payment.status !== "INITIATED") {
      return NextResponse.json(
        { message: "Payment confirm qilish uchun noto‘g‘ri holatda" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) =>
      completeSuccessfulPaymentInTx(tx, {
        paymentId: payment.id,
        travelPlanId: payment.travelPlanId,
        actorId: actor.id,
        previousPaymentStatus: payment.status,
      }),
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

