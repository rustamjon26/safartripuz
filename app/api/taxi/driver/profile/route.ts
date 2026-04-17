import { prisma } from "@/lib/prisma";
import { fail, handleApiError, hasVehicle, ok, onboardingResponse, requireTaxiDriver } from "../_utils";

type ProfileInput = {
  licenseNumber?: string;
  licenseExpiry?: string;
};

export async function GET() {
  try {
    const actor = await requireTaxiDriver();
    const [profile, vehicles] = await Promise.all([
      prisma.driverProfile.findUnique({
        where: { driverId: actor.id },
      }),
      prisma.vehicle.findMany({
        where: { driverId: actor.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    if (!profile || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    return ok({ profile, vehicles, onboarding: false });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    const body = (await req.json()) as ProfileInput;

    if (!body.licenseNumber || !body.licenseExpiry) {
      return fail("licenseNumber va licenseExpiry majburiy", 400);
    }
    const expiry = new Date(body.licenseExpiry);
    if (Number.isNaN(expiry.getTime())) {
      return fail("licenseExpiry noto'g'ri formatda", 400);
    }

    const exists = await prisma.driverProfile.findUnique({
      where: { driverId: actor.id },
      select: { id: true },
    });
    if (exists) return fail("Driver profile allaqachon mavjud", 409);

    const profile = await prisma.driverProfile.create({
      data: {
        driverId: actor.id,
        licenseNumber: body.licenseNumber,
        licenseExpiry: expiry,
      },
    });
    return ok(profile, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireTaxiDriver();
    const profileExists = await prisma.driverProfile.findUnique({
      where: { driverId: actor.id },
      select: { id: true },
    });
    if (!profileExists || !(await hasVehicle(actor.id))) {
      return onboardingResponse();
    }
    const body = (await req.json()) as ProfileInput;
    if (!body.licenseNumber && !body.licenseExpiry) {
      return fail("Kamida bitta maydon yuborilishi kerak", 400);
    }

    const data: { licenseNumber?: string; licenseExpiry?: Date } = {};
    if (body.licenseNumber) data.licenseNumber = body.licenseNumber;
    if (body.licenseExpiry) {
      const expiry = new Date(body.licenseExpiry);
      if (Number.isNaN(expiry.getTime())) return fail("licenseExpiry noto'g'ri formatda", 400);
      data.licenseExpiry = expiry;
    }

    const profile = await prisma.driverProfile.update({
      where: { driverId: actor.id },
      data,
    });
    return ok(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
