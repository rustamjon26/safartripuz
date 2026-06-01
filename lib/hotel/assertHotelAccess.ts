import { prisma } from "@/lib/prisma";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";

export async function assertHotelAccess(
  actorId: string,
  actorRole: string,
  hotelId: string,
) {
  if (actorRole === "admin" || actorRole === "super_admin") {
    return prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true } });
  }

  const ctx = await getApprovedHotelContextByUserId(actorId);
  if (!ctx || ctx.hotel.id !== hotelId) return null;
  return ctx.hotel;
}

export const HOTEL_ROOM_MANAGER_ROLES = [
  "hotel_manager",
  "admin",
  "super_admin",
  "receptionist",
] as const;

export const HOTEL_ROOM_WRITE_ROLES = ["hotel_manager", "admin", "super_admin"] as const;
