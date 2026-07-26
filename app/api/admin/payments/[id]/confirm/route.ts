import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "approve") {
      return NextResponse.json({ message: "action: approve kerak" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { travelPlan: { select: { id: true, userId: true, status: true } } },
    });
    if (!payment) return NextResponse.json({ message: "Payment topilmadi" }, { status: 404 });
    if (payment.provider !== "MANUAL") {
      return NextResponse.json({ message: "Faqat MANUAL to'lovlar tasdiqlanadi" }, { status: 400 });
    }
    if (payment.status !== "PENDING" && payment.status !== "INITIATED") {
      return NextResponse.json({ message: "To'lov allaqachin yakunlangan yoki bekor" }, { status: 400 });
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
    if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
