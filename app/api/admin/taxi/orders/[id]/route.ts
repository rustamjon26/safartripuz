import { NextResponse } from "next/server";
import type { TaxiOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../../_utils";

const TAXI_ORDER_STATUSES: TaxiOrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTE",
];

function parseTaxiOrderStatus(s: string | undefined): TaxiOrderStatus | null {
  if (!s) return null;
  return TAXI_ORDER_STATUSES.includes(s as TaxiOrderStatus) ? (s as TaxiOrderStatus) : null;
}

type PatchInput = {
  status?: string;
  reason?: string;
  resolution?: "REFUND" | "RELEASE" | "SPLIT";
  note?: string;
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

    const existing = await prisma.taxiOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    if (body.resolution) {
      if (existing.status !== "DISPUTE") {
        return NextResponse.json({ message: "Order is not in dispute" }, { status: 400 });
      }
      const nextStatus = body.resolution === "RELEASE" ? "COMPLETED" : "CANCELLED";
      const updated = await prisma.$transaction(async (tx) => {
        const order = await tx.taxiOrder.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            cancellationReason:
              body.resolution === "RELEASE" ? undefined : body.note ?? "Resolved by admin",
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
    }

    const nextStatus = parseTaxiOrderStatus(body.status);
    if (!nextStatus) {
      return NextResponse.json({ message: "Invalid or missing status" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          driverNote: body.reason ?? undefined,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: next.id,
          actorId: actor.id,
          actorRole: "admin",
          fromStatus: existing.status,
          toStatus: nextStatus,
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
