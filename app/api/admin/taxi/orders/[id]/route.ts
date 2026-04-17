import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../../_utils";

type PatchInput = {
  status?: string;
  reason?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTaxiAdmin();
    const { id } = await params;
    const order = await prisma.taxiOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: { include: { driverProfile: true, taxiVehicles: true } },
        service: true,
        vehicle: true,
        travelPlan: true,
        logs: { orderBy: { createdAt: "desc" }, include: { actor: true } },
        review: true,
        earning: true,
      },
    });
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiAdmin();
    const { id } = await params;
    const body = (await req.json()) as PatchInput;
    if (!body.status) return NextResponse.json({ message: "status is required" }, { status: 400 });

    const existing = await prisma.taxiOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          driverNote: body.reason ?? undefined,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: next.id,
          actorId: actor.id,
          actorRole: "admin",
          fromStatus: existing.status,
          toStatus: body.status as string,
          note: body.reason ?? null,
        },
      });

      return next;
    });

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
