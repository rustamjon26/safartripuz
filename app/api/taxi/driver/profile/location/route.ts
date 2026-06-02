import { NextRequest, NextResponse } from "next/server";
import { getDriverActor } from "@/app/api/taxi/driver/_utils";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getDriverActor();
    const { lat, lng } = (await req.json()) as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid coords" }, { status: 400 });
    }
    await prisma.driverProfile.update({
      where: { driverId: actor.id },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
