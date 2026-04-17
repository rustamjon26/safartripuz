import { prisma } from "@/lib/prisma";
import { TAXI_ERRORS } from "@/lib/taxi/errors";
import { fail, handleApiError, hasDriverProfile, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../../_utils";

type OnlineInput = {
  isOnline?: boolean;
};

export async function PATCH(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    if (!(await hasDriverProfile(actor.id)) || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const body = (await req.json()) as OnlineInput;
    if (typeof body.isOnline !== "boolean") {
      return fail("isOnline boolean bo'lishi kerak", 400);
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { driverId: actor.id },
      select: { id: true, licenseExpiry: true, isOnline: true, isVerified: true },
    });
    if (!profile) return fail("Driver profile topilmadi", 404);

    if (body.isOnline) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { isBlocked: true },
      });
      if (user?.isBlocked) {
        return fail("Bloklangan haydovchi onlayn bo'la olmaydi", 403);
      }
      if (!profile.isVerified) {
        return fail("Faollashtirilgan haydovchi sifatida tasdiqlanmaguncha onlayn bo'lish mumkin emas", 403);
      }
      const activeVehicleCount = await prisma.vehicle.count({
        where: { driverId: actor.id, isActive: true },
      });
      if (activeVehicleCount === 0) {
        return fail(TAXI_ERRORS.NO_ACTIVE_VEHICLE, 400);
      }
      if (profile.licenseExpiry <= new Date()) {
        return fail("Muddati o'tgan haydovchilik guvohnomasi bilan online bo'lmaysiz", 400);
      }
    }

    const updated = await prisma.driverProfile.update({
      where: { driverId: actor.id },
      data: { isOnline: body.isOnline },
    });
    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
