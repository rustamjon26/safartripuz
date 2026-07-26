import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { completeSuccessfulPaymentInTx } from "@/lib/payments/completeSuccessfulPaymentTx";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

function successRedirect(paymentId: string, already = false) {
  const base = appBaseUrl();
  const suffix = already ? "&already=true" : "";
  return NextResponse.redirect(`${base}/payments/success?paymentId=${paymentId}${suffix}`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const actor = await requireUser();
    const { paymentId } = await params;
    const url = new URL(req.url);
    const shouldRedirect = url.searchParams.get("redirect") === "1";

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { travelPlan: { select: { id: true, userId: true, totalAmount: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment topilmadi" }, { status: 404 });
    }

    if (payment.travelPlan.userId !== actor.id) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    if (payment.status === "SUCCESS") {
      if (shouldRedirect) {
        return successRedirect(paymentId, true);
      }
      return NextResponse.json({ message: "Allaqachon to'langan" }, { status: 400 });
    }

    if (payment.status !== "INITIATED" && payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "To'lovni tasdiqlash uchun noto'g'ri holat", status: payment.status },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) =>
      completeSuccessfulPaymentInTx(tx, {
        paymentId: payment.id,
        travelPlanId: payment.travelPlanId,
        actorId: actor.id,
        previousPaymentStatus: payment.status,
      }),
    );

    if (shouldRedirect) {
      return successRedirect(paymentId);
    }

    return NextResponse.json(
      { message: "Tolov muvaffaqiyatli qabul qilindi", ...updated },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/payments/webhook/mock/[paymentId]] error:", error);
    return NextResponse.json(
      { error: "Server xatosi", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
