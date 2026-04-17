import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../../_utils";

type ResolveInput = {
  resolution?: "REFUND" | "RELEASE" | "SPLIT";
  note?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiAdmin();
    const { id } = await params;
    const body = (await req.json()) as ResolveInput;
    if (!body.resolution) {
      return NextResponse.json({ message: "resolution is required" }, { status: 400 });
    }

    const existing = await prisma.taxiOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ message: "Order not found" }, { status: 404 });
    if (existing.status !== "DISPUTE") {
      return NextResponse.json({ message: "Order is not in dispute" }, { status: 400 });
    }

    const nextStatus = body.resolution === "RELEASE" ? "COMPLETED" : "CANCELLED";
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          cancellationReason: body.resolution === "RELEASE" ? undefined : body.note ?? "Resolved by admin",
          driverNote: body.note ?? undefined,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: order.id,
          actorId: actor.id,
          actorRole: "admin",
          fromStatus: existing.status,
          toStatus: nextStatus,
          note: `${body.resolution}${body.note ? `: ${body.note}` : ""}`,
        },
      });

      return order;
    });

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
