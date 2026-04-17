import { prisma } from "@/lib/prisma";

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
