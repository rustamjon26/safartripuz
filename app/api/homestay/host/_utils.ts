import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export type HomeStayActor = { id: string; role: "home_stay_partner" };

export async function requireHomeStayHost(): Promise<HomeStayActor> {
  const actor = await requireRole(["home_stay_partner"]);
  return actor as HomeStayActor;
}

export async function hasActiveListing(hostId: string) {
  const count = await prisma.homeStayListing.count({
    where: { hostId, status: "ACTIVE" },
  });
  return count > 0;
}

export function onboardingResponse() {
  return NextResponse.json({ onboarding: true }, { status: 200 });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  if (message === "UNAUTHORIZED") return fail("Unauthorized", 401);
  if (message === "FORBIDDEN") return fail("Forbidden", 403);
  return fail("Server error", 500);
}

export async function writeAuditLog(args: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      oldData: args.oldData as never,
      newData: args.newData as never,
    },
  });
}
