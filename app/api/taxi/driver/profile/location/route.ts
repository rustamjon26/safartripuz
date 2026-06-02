import { NextRequest, NextResponse } from "next/server";
import { getDriverActor } from "@/app/api/taxi/driver/_utils";
import { prisma } from "@/lib/prisma";
import { emitToOrder } from "@/lib/socket";

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

    const activeOrder = await prisma.taxiOrder.findFirst({
      where: {
        driverId: actor.id,
        status: { in: ["ACCEPTED", "ARRIVED", "IN_PROGRESS"] },
      },
      select: { id: true },
    });

    if (activeOrder) {
      emitToOrder(activeOrder.id, "driver:location", {
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
