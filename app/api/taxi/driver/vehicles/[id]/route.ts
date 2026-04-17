import { prisma } from "@/lib/prisma";
import { fail, handleApiError, hasDriverProfile, hasVehicle, onboardingResponse, ok, requireTaxiDriver } from "../../_utils";
import type { TaxiVehicleCategory } from "@prisma/client";

type VehicleUpdateInput = {
  make?: string;
  model?: string;
  color?: string;
  plateNumber?: string;
  year?: number;
  category?: TaxiVehicleCategory;
  images?: string[];
  isActive?: boolean;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;
    const body = (await req.json()) as VehicleUpdateInput;

    const existing = await prisma.vehicle.findFirst({
      where: { id, driverId: actor.id },
      select: { id: true },
    });
    if (!existing) return fail("Vehicle topilmadi", 404);

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        make: body.make,
        model: body.model,
        color: body.color,
        plateNumber: body.plateNumber,
        year: body.year,
        category: body.category,
        images: body.images,
        isActive: body.isActive,
      },
    });
    return ok(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const { id } = await params;

    const existing = await prisma.vehicle.findFirst({
      where: { id, driverId: actor.id },
      select: { id: true },
    });
    if (!existing) return fail("Vehicle topilmadi", 404);

    const activeOrderCount = await prisma.taxiOrder.count({
      where: {
        vehicleId: id,
        status: { in: ["ACCEPTED", "ARRIVED", "IN_PROGRESS"] },
      },
    });
    if (activeOrderCount > 0) {
      return fail("Active order borligi sababli vehicle ni o'chirib bo'lmaydi", 400);
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
    return ok(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}
