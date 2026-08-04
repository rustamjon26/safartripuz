import { prisma } from "@/lib/prisma";
import type { Partner, PartnerType, Prisma } from "@prisma/client";

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

type PartnerTx = Prisma.TransactionClient;

/**
 * Ensure a user assigned taxi / taxi_partner has an approved taxi Partner row.
 * Converts a partner of another type only when it has no Hotel attached.
 */
export async function ensureApprovedTaxiPartner(
  tx: PartnerTx,
  input: {
    userId: string;
    displayName: string;
    contactEmail: string | null;
    contactPhone: string | null;
  },
): Promise<Partner> {
  const existing = await tx.partner.findUnique({
    where: { userId: input.userId },
    include: { hotel: { select: { id: true } } },
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

  if (existing.type === "taxi") {
    if (existing.status === "approved") return existing;
    return tx.partner.update({
      where: { id: existing.id },
      data: { status: "approved" },
    });
  }

  // Do not strip a hotel-linked partner — keep data integrity.
  if (existing.hotel) return existing;

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
