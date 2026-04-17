import { prisma } from "@/lib/prisma";
import { fail, handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../_utils";
import type { TaxiVehicleCategory } from "@prisma/client";

type VehicleInput = {
  make?: string;
  model?: string;
  color?: string;
  plateNumber?: string;
  year?: number;
  category?: TaxiVehicleCategory;
  images?: string[];
};

export async function GET() {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const vehicles = await prisma.vehicle.findMany({
      where: { driverId: actor.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({
      data: vehicles,
      pagination: {
        page: 1,
        limit: vehicles.length || 1,
        total: vehicles.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    const body = (await req.json()) as VehicleInput;
    if (
      !body.make ||
      !body.model ||
      !body.color ||
      !body.plateNumber ||
      !body.year ||
      !body.category ||
      !Array.isArray(body.images)
    ) {
      return fail("Majburiy maydonlar to'liq emas", 400);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: actor.id,
        make: body.make,
        model: body.model,
        color: body.color,
        plateNumber: body.plateNumber,
        year: body.year,
        category: body.category,
        images: body.images,
      },
    });
    return ok(vehicle, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
