import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../../_utils";

type PatchInput = {
  action?: "block" | "unblock" | "verify";
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTaxiAdmin();
    const { id } = await params;

    const [driver, recentOrders, earningStats] = await Promise.all([
      prisma.user.findFirst({
        where: { id, role: "taxi_partner" },
        include: {
          driverProfile: true,
          taxiVehicles: true,
        },
      }),
      prisma.taxiOrder.findMany({
        where: { driverId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, first_name: true, last_name: true, phone: true } },
          service: true,
        },
      }),
      prisma.driverEarning.aggregate({
        where: { driverId: id },
        _sum: {
          grossAmount: true,
          platformFee: true,
          netAmount: true,
        },
      }),
    ]);

    if (!driver) return NextResponse.json({ message: "Driver not found" }, { status: 404 });

    return NextResponse.json(
      {
        driver,
        recentOrders,
        earningsSummary: {
          totalGross: Number(earningStats._sum.grossAmount ?? 0),
          totalFee: Number(earningStats._sum.platformFee ?? 0),
          totalNet: Number(earningStats._sum.netAmount ?? 0),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTaxiAdmin();
    const { id } = await params;
    const body = (await req.json()) as PatchInput;
    if (!body.action) return NextResponse.json({ message: "action is required" }, { status: 400 });

    const driver = await prisma.user.findFirst({
      where: { id, role: "taxi_partner" },
      select: { id: true, isBlocked: true },
    });
    if (!driver) return NextResponse.json({ message: "Driver not found" }, { status: 404 });

    if (body.action === "block" || body.action === "unblock") {
      const updated = await prisma.user.update({
        where: { id: driver.id },
        data: { isBlocked: body.action === "block" },
      });
      return NextResponse.json({ driver: updated }, { status: 200 });
    }

    const profile = await prisma.driverProfile.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        licenseNumber: "PENDING",
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isVerified: true,
      },
      update: { isVerified: true },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
