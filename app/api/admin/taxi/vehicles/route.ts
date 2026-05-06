import { NextResponse } from "next/server";
import type { TaxiVehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTaxiAdmin, unauthorizedResponse } from "../_utils";

const VEHICLE_CATEGORIES: TaxiVehicleCategory[] = [
  "STANDARD",
  "COMFORT",
  "MINIVAN",
  "PREMIUM",
];

function isTaxiVehicleCategory(s: string): s is TaxiVehicleCategory {
  return (VEHICLE_CATEGORIES as string[]).includes(s);
}

export async function GET(req: Request) {
  try {
    await requireTaxiAdmin();
    const { searchParams } = new URL(req.url);
    const driverId = (searchParams.get("driverId") ?? "").trim();
    const category = (searchParams.get("category") ?? "").trim();
    const isActiveRaw = searchParams.get("isActive");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where: {
      driverId?: string;
      category?: TaxiVehicleCategory;
      isActive?: boolean;
    } = {};
    if (driverId) where.driverId = driverId;
    if (category && isTaxiVehicleCategory(category)) where.category = category;
    if (isActiveRaw === "true") where.isActive = true;
    if (isActiveRaw === "false") where.isActive = false;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          driver: {
            select: { id: true, first_name: true, last_name: true, phone: true, email: true },
          },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return NextResponse.json({
      data: vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    }, { status: 200 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
