import { prisma } from "@/lib/prisma";
import type { Partner, PartnerType, Prisma } from "@prisma/client";
import { isGuidePanelRole, isTaxiPanelRole } from "@/src/shared/roles";

export async function getApprovedPartnerContextByUserId(
  userId: string,
  type: PartnerType,
) {
  const partner = await prisma.partner.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      displayName: true,
    },
  });

  if (!partner || partner.type !== type || partner.status !== "approved") {
    return null;
  }

  return partner;
}

type PartnerDb = Prisma.TransactionClient | typeof prisma;

/**
 * Ensure a user assigned taxi / taxi_partner has an approved taxi Partner row.
 *
 * Always sets `type: "taxi"` + `status: "approved"`, including when a Hotel
 * row is still linked (hotel stays in DB; hotel PMS requires type=hotel so
 * it becomes inaccessible — matching the new role).
 */
export async function ensureApprovedTaxiPartner(
  tx: PartnerDb,
  input: {
    userId: string;
    displayName: string;
    contactEmail: string | null;
    contactPhone: string | null;
  },
): Promise<Partner> {
  const existing = await tx.partner.findUnique({
    where: { userId: input.userId },
  });

  if (!existing) {
    return tx.partner.create({
      data: {
        userId: input.userId,
        type: "taxi",
        status: "approved",
        displayName: input.displayName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    });
  }

  if (existing.type === "taxi" && existing.status === "approved") {
    return existing;
  }

  return tx.partner.update({
    where: { id: existing.id },
    data: {
      type: "taxi",
      status: "approved",
      displayName: existing.displayName ?? input.displayName,
      contactEmail: existing.contactEmail ?? input.contactEmail,
      contactPhone: existing.contactPhone ?? input.contactPhone,
    },
  });
}

/** Roles that should keep an approved Partner row. */
export function roleNeedsApprovedPartner(role: string): boolean {
  return (
    isTaxiPanelRole(role) ||
    isGuidePanelRole(role) ||
    role === "hotel_manager" ||
    role === "home_stay_partner" ||
    role === "restaurant_manager"
  );
}

/**
 * When admin moves a user off partner roles (e.g. taxi → support), demote
 * Partner.status so list Holat / partner APIs stop treating them as approved.
 * Keeps the Partner row + hotel/listings for history (no delete).
 */
export async function demotePartnerIfRoleLeft(
  tx: PartnerDb,
  userId: string,
  newRole: string,
): Promise<void> {
  if (roleNeedsApprovedPartner(newRole)) return;

  const existing = await tx.partner.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  if (!existing || existing.status !== "approved") return;

  await tx.partner.update({
    where: { id: existing.id },
    data: { status: "pending" },
  });
}

/**
 * Ensure a user assigned guide / guide_partner has an approved guide Partner.
 * Mirrors taxi: rewrite Partner.type even when a Hotel row is still linked.
 */
export async function ensureApprovedGuidePartner(
  tx: PartnerDb,
  input: {
    userId: string;
    displayName: string;
    contactEmail: string | null;
    contactPhone: string | null;
  },
): Promise<Partner> {
  const existing = await tx.partner.findUnique({
    where: { userId: input.userId },
  });

  if (!existing) {
    return tx.partner.create({
      data: {
        userId: input.userId,
        type: "guide",
        status: "approved",
        displayName: input.displayName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    });
  }

  if (existing.type === "guide" && existing.status === "approved") {
    return existing;
  }

  return tx.partner.update({
    where: { id: existing.id },
    data: {
      type: "guide",
      status: "approved",
      displayName: existing.displayName ?? input.displayName,
      contactEmail: existing.contactEmail ?? input.contactEmail,
      contactPhone: existing.contactPhone ?? input.contactPhone,
    },
  });
}
