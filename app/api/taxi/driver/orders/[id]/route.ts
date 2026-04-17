import { prisma } from "@/lib/prisma";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
import { fail, handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../../_utils";

type UpdateOrderInput = {
  status?:
    | "ACCEPTED"
    | "ARRIVED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  vehicleId?: string;
  finalPrice?: number;
  distanceKm?: number;
  note?: string;
  cancellationReason?: string;
};

const allowedTransitions: Record<
  string,
  Array<"ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">
> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTE: [],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;
    const order = await prisma.taxiOrder.findFirst({
      where: { id, driverId: actor.id },
      include: {
        customer: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        },
        vehicle: true,
        service: true,
        logs: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { id: true, first_name: true, last_name: true, role: true } } },
        },
        earning: true,
      },
    });
    if (!order) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);
    return ok(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;
    const body = (await req.json()) as UpdateOrderInput;
    if (!body.status) return fail("status majburiy", 400);

    const existing = await prisma.taxiOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        driverId: true,
        estimatedPrice: true,
      },
    });
    if (!existing) return fail(TAXI_ERRORS.ORDER_NOT_FOUND, 404);

    const targetStatus = body.status;
    if (!allowedTransitions[existing.status]?.includes(targetStatus)) {
      return fail(TAXI_ERRORS.INVALID_STATUS_TRANSITION, 400);
    }

    if (existing.driverId && existing.driverId !== actor.id) {
      return fail(TAXI_ERRORS.ORDER_ALREADY_ASSIGNED, 409);
    }

    if (targetStatus === "ACCEPTED" && !body.vehicleId) {
      return fail(TAXI_ERRORS.NO_ACTIVE_VEHICLE, 400);
    }
    if (targetStatus === "ACCEPTED") {
      const profile = await prisma.driverProfile.findUnique({
        where: { driverId: actor.id },
        select: { isOnline: true },
      });
      if (!profile?.isOnline) return fail(TAXI_ERRORS.DRIVER_OFFLINE, 400);
    }
    if (targetStatus === "COMPLETED" && (typeof body.finalPrice !== "number" || typeof body.distanceKm !== "number")) {
      return fail("COMPLETED uchun finalPrice va distanceKm majburiy", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (targetStatus === "ACCEPTED" && body.vehicleId) {
        const vehicle = await tx.vehicle.findFirst({
          where: { id: body.vehicleId, driverId: actor.id, isActive: true },
          select: { id: true },
        });
        if (!vehicle) throw new Error("INVALID_VEHICLE");
      }

      const updated = await tx.taxiOrder.update({
        where: { id: existing.id },
        data: {
          driverId: existing.driverId ?? actor.id,
          vehicleId: targetStatus === "ACCEPTED" ? body.vehicleId : undefined,
          status: targetStatus,
          driverNote: body.note ?? undefined,
          cancelledBy: targetStatus === "CANCELLED" ? "DRIVER" : undefined,
          cancellationReason: targetStatus === "CANCELLED" ? body.cancellationReason ?? "Driver cancelled" : undefined,
          finalPrice: targetStatus === "COMPLETED" ? body.finalPrice : undefined,
          distanceKm: targetStatus === "COMPLETED" ? body.distanceKm : undefined,
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: updated.id,
          actorId: actor.id,
          actorRole: "taxi_partner",
          fromStatus: existing.status,
          toStatus: updated.status,
          note: body.note ?? null,
        },
      });

      if (targetStatus === "COMPLETED") {
        const finalPrice = Number(body.finalPrice);
        const platformFee = Number((finalPrice * 0.15).toFixed(2));
        const netAmount = Number((finalPrice - platformFee).toFixed(2));

        await tx.driverEarning.create({
          data: {
            driverId: actor.id,
            orderId: updated.id,
            grossAmount: finalPrice,
            platformFee,
            netAmount,
            status: "PENDING",
          },
        });

        await tx.driverProfile.update({
          where: { driverId: actor.id },
          data: { totalTrips: { increment: 1 } },
        });
      }

      return updated;
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VEHICLE") {
      return fail(TAXI_ERRORS.NO_ACTIVE_VEHICLE, 400);
    }
    return handleApiError(error);
  }
}
