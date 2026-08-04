import type { StaffContext } from "../domain/types";
import { staffRepository } from "../repository/staff.repository";

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
  let staff = await staffRepository.findActiveStaffForUser(userId);

  if (!staff) {
    // hotel_manager owns the property but may lack a HotelStaff row — /staff
    // APIs all require one. Auto-provision a MANAGER profile for the owned hotel.
    const hotelId = await staffRepository.findHotelIdOwnedByUser(userId);
    if (!hotelId) {
      throw new StaffContextError("HotelStaff profil topilmadi");
    }
    staff = await staffRepository.ensureManagerStaffProfile(userId, hotelId);
  }
  // allow draft for partner testing; block suspended
  if (staff.hotelStatus === "suspended") {
    throw new StaffContextError("Mehmonxona suspended");
  }

  return {
    userId,
    hotelId: staff.hotelId,
    staffId: staff.id,
    department: departmentFromStaffRole(staff.role),
    displayName: `${staff.firstName}${staff.lastName ? ` ${staff.lastName}` : ""}`.trim(),
  };
}
