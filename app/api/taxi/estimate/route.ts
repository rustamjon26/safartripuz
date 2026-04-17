import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/taxi/haversine";
import { fail, handleApiError, ok } from "../_utils";

type EstimateInput = {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  serviceId?: string;
};

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = (await req.json()) as EstimateInput;
    if (
      typeof body.pickupLat !== "number" ||
      typeof body.pickupLng !== "number" ||
      typeof body.dropoffLat !== "number" ||
      typeof body.dropoffLng !== "number"
    ) {
      return fail("pickup/dropoff koordinatalari majburiy", 400);
    }

    let pricePerKm = 10000;
    if (body.serviceId) {
      const service = await prisma.taxiService.findFirst({
        where: { id: body.serviceId, isActive: true },
        select: { id: true, price: true },
      });
      if (!service) return fail("Taxi service topilmadi", 404);
      pricePerKm = Number(service.price);
    }

    const estimatedDistanceKm = haversineDistanceKm(
      body.pickupLat,
      body.pickupLng,
      body.dropoffLat,
      body.dropoffLng,
    );
    const estimatedPrice = Number((estimatedDistanceKm * pricePerKm).toFixed(2));
    const estimatedMinutes = Math.max(1, Math.round((estimatedDistanceKm / 40) * 60));

    return ok({
      estimatedPrice,
      estimatedDistanceKm: Number(estimatedDistanceKm.toFixed(2)),
      estimatedMinutes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
