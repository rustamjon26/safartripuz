import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  travelPlanId: z.string(),
  provider: z.enum(["CLICK", "PAYME", "MANUAL", "MOCK"]).default("MOCK"),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const { travelPlanId, provider, idempotencyKey } = parsed.data;

    const plan = await prisma.travelPlan.findFirst({
      where: { id: travelPlanId, userId: actor.id },
      select: { id: true, status: true, totalAmount: true },
    });
    if (!plan) {
      return NextResponse.json({ message: "Travel plan topilmadi" }, { status: 404 });
    }
    if (plan.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { message: "Travel plan to‘lov uchun yaroqli holatda emas" },
        { status: 400 },
      );
    }

    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return NextResponse.json({ payment: existing, reused: true }, { status: 200 });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        travelPlanId: plan.id,
        provider,
        status: "PENDING",
        amount: plan.totalAmount,
        currency: "UZS",
        idempotencyKey: idempotencyKey ?? null,
        externalRef: `PAY-${Date.now().toString(36).toUpperCase()}`,
        metadata: { source: "web", actorId: actor.id },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "PAYMENT_INTENT_CREATED",
        entity: "Payment",
        entityId: payment.id,
        newData: {
          travelPlanId: payment.travelPlanId,
          provider: payment.provider,
          amount: payment.amount,
          status: payment.status,
        },
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

