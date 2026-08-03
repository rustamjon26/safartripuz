import { prisma } from "@/src/shared/db/prisma";
import type { StaffContext } from "../domain/types";

export class StaffContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffContextError";
  }
}

/** Map HotelStaff.role → department key used for chat channels. */
export function departmentFromStaffRole(role: string): string {
  const r = role.toUpperCase();
  if (r === "CLEANER") return "HOUSEKEEPING";
  if (r === "RECEPTION" || r === "RECEPTIONIST") return "RECEPTION";
  if (r === "WAITER") return "RESTAURANT";
  if (r === "MANAGER" || r === "ADMIN") return "MANAGEMENT";
  return "GENERAL";
}

export async function resolveStaffContext(userId: string): Promise<StaffContext> {
  const staff = await prisma.hotelStaff.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      hotelId: true,
      role: true,
      firstName: true,
      lastName: true,
      hotel: { select: { status: true } },
    },
  });

  if (!staff) {
    throw new StaffContextError("HotelStaff profil topilmadi");
  }
  if (staff.hotel.status !== "active" && staff.hotel.status !== "draft") {
    // allow draft for partner testing; block suspended
    if (staff.hotel.status === "suspended") {
      throw new StaffContextError("Mehmonxona suspended");
    }
  }

  return {
    userId,
    hotelId: staff.hotelId,
    staffId: staff.id,
    department: departmentFromStaffRole(staff.role),
    displayName: `${staff.firstName}${staff.lastName ? ` ${staff.lastName}` : ""}`.trim(),
  };
}
