import type { Hotel, Partner, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function getApprovedHotelContextByUserId(userId: string) {
  // 1. Try finding as Partner (Hotel Owner/Manager)
  const partner = await prisma.partner.findUnique({
    where: { userId },
    select: { 
      id: true, 
      type: true, 
      status: true,
      hotel: true
    }
  });

  if (partner && partner.type === "hotel" && partner.status === "approved" && partner.hotel) {
    return { 
      partner, 
      hotel: partner.hotel,
      isStaff: false,
      staffRecord: null 
    };
  }

  // 2. Try finding as Hotel Staff
  const staff = await prisma.hotelStaff.findUnique({
    where: { userId },
    include: { hotel: true }
  });

  if (staff && staff.hotel && staff.isActive) {
    return {
      partner: null,
      hotel: staff.hotel,
      isStaff: true,
      staffRecord: staff
    };
  }

  return null;
}

export type EnsureHotelManagerInput = {
  userId: string;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
};

/**
 * Admin assigned `hotel_manager` — user must have approved hotel Partner + Hotel.
 * Previously we only created these when Partner was missing, so pending apply
 * partners stayed hotel-less and PMS showed "mehmonxona biriktirilmagan".
 */
export async function ensureApprovedHotelManagerSetup(
  input: EnsureHotelManagerInput,
  client: DbClient = prisma,
): Promise<{ partner: Partner; hotel: Hotel }> {
  const existing = await client.partner.findUnique({
    where: { userId: input.userId },
    include: {
      hotel: true,
      taxiServices: { select: { id: true }, take: 1 },
      guideListings: { select: { id: true }, take: 1 },
    },
  });

  if (!existing) {
    const partner = await client.partner.create({
      data: {
        userId: input.userId,
        type: "hotel",
        status: "approved",
        displayName: input.displayName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    });
    const hotel = await client.hotel.create({
      data: {
        partnerId: partner.id,
        status: "active",
        name: `${input.displayName} Hotel`,
        totalRooms: 10,
        city: "",
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    });
    return { partner, hotel };
  }

  const hasConflictingAssets =
    existing.type !== "hotel" &&
    (existing.taxiServices.length > 0 || existing.guideListings.length > 0);

  if (hasConflictingAssets) {
    throw new Error(
      "User already has a non-hotel partner with linked taxi/guide data",
    );
  }

  let partner: Partner = existing;
  if (existing.type !== "hotel" || existing.status !== "approved") {
    partner = await client.partner.update({
      where: { id: existing.id },
      data: {
        type: "hotel",
        status: "approved",
        displayName: existing.displayName ?? input.displayName,
        contactEmail: existing.contactEmail ?? input.contactEmail,
        contactPhone: existing.contactPhone ?? input.contactPhone,
      },
    });
  }

  if (existing.hotel) {
    return { partner, hotel: existing.hotel };
  }

  const hotel = await client.hotel.create({
    data: {
      partnerId: partner.id,
      status: "active",
      name: `${input.displayName} Hotel`,
      totalRooms: 10,
      city: "",
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
    },
  });
  return { partner, hotel };
}
