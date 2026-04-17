import { prisma } from "@/lib/prisma";
import type { PartnerType } from "@prisma/client";

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
