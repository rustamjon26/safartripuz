import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import {
  ensureApprovedGuidePartner,
  getApprovedPartnerContextByUserId,
} from "@/lib/partner";
import { isGuidePanelRole } from "@/src/shared/roles";

export type GuidePartnerActor = {
  id: string;
  role: "guide";
  partnerId: string;
};

/**
 * Both `guide` (the older assignment) and `guide_partner` reach this panel,
 * then get normalised onto Partner.type=guide.
 */
export async function requireGuidePartner(): Promise<GuidePartnerActor> {
  const actor = await requireUser();
  if (!isGuidePanelRole(actor.role)) {
    throw new Error("FORBIDDEN");
  }

  let partner = await getApprovedPartnerContextByUserId(actor.id, "guide");
  if (!partner) {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
      },
    });
    if (!user) throw new Error("FORBIDDEN");
    const displayName =
      `${user.first_name} ${user.last_name}`.trim() || user.email;
    await ensureApprovedGuidePartner(prisma, {
      userId: actor.id,
      displayName,
      contactEmail: user.email,
      contactPhone: user.phone,
    });
    partner = await getApprovedPartnerContextByUserId(actor.id, "guide");
  }

  if (!partner) {
    throw new Error("FORBIDDEN");
  }

  return {
    id: actor.id,
    role: "guide",
    partnerId: partner.id,
  };
}

export async function hasActiveListing(guideId: string) {
  const count = await prisma.guideListing.count({
    where: { hostId: guideId, status: "ACTIVE" },
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

export async function writeGuideBookingLog(args: {
  bookingId: string;
  actorId: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}) {
  await prisma.guideBookingLog.create({
    data: {
      bookingId: args.bookingId,
      actorId: args.actorId,
      actorRole: args.actorRole,
      fromStatus: args.fromStatus,
      toStatus: args.toStatus,
      note: args.note ?? null,
    },
  });
}
