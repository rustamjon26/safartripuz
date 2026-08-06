export type HotelStaffJobRole =
  | "RECEPTION"
  | "CLEANER"
  | "WAITER"
  | "MANAGER";

export type HotelStaffPlatformRole =
  | "cleaner"
  | "receptionist"
  | "waiter"
  | "hotel_staff";

/** Map HotelStaff job title → platform `User.role` for /staff PWA gates. */
export function jobRoleToPlatformRole(
  role: string | null | undefined,
): HotelStaffPlatformRole {
  const job = String(role ?? "").toUpperCase();
  if (job === "CLEANER") return "cleaner";
  if (job === "RECEPTION" || job === "RECEPTIONIST") return "receptionist";
  if (job === "WAITER") return "waiter";
  if (job === "MANAGER" || job === "ADMIN") return "hotel_staff";
  return "hotel_staff";
}

/** Map platform `User.role` → HotelStaff job title (admin link defaults). */
export function platformRoleToJobRole(
  role: string | null | undefined,
): HotelStaffJobRole {
  switch (role) {
    case "cleaner":
      return "CLEANER";
    case "receptionist":
      return "RECEPTION";
    case "waiter":
      return "WAITER";
    case "hotel_staff":
    case "hotel_manager":
      return "MANAGER";
    default:
      return "RECEPTION";
  }
}

/** Platform roles that are hotel frontline staff (need HotelStaff row). */
export function isHotelStaffPlatformRole(role: string | null | undefined): boolean {
  return (
    role === "cleaner" ||
    role === "receptionist" ||
    role === "waiter" ||
    role === "hotel_staff"
  );
}

/** Roles that must not be overwritten by HR staff-job remaps. */
export function isProtectedPlatformRole(role: string | null | undefined): boolean {
  return (
    role === "hotel_manager" ||
    role === "admin" ||
    role === "super_admin" ||
    role === "support"
  );
}
