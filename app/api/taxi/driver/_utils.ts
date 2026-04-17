import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export type TaxiDriverActor = { id: string; role: "taxi_partner" };

export async function requireTaxiDriver(): Promise<TaxiDriverActor> {
  const actor = await requireRole(["taxi_partner"]);
  return actor as TaxiDriverActor;
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  if (message === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (message === "FORBIDDEN") return fail("Ruxsat yo'q", 403);
  return fail("Server xatosi", 500);
}

export async function writeTaxiOrderLog(args: {
  orderId: string;
  actorId: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}) {
  await prisma.taxiOrderLog.create({
    data: {
      orderId: args.orderId,
      actorId: args.actorId,
      actorRole: args.actorRole,
      fromStatus: args.fromStatus,
      toStatus: args.toStatus,
      note: args.note ?? null,
    },
  });
}

export async function hasVehicle(driverId: string) {
  const count = await prisma.vehicle.count({
    where: { driverId, isActive: true },
  });
  return count > 0;
}

export async function hasDriverProfile(driverId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { driverId },
    select: { id: true },
  });
  return Boolean(profile);
}

export function onboardingResponse() {
  return NextResponse.json({ onboarding: true }, { status: 200 });
}
