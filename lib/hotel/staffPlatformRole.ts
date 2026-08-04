import type { Role } from "@prisma/client";

/** Map HotelStaff job title → platform `User.role` for /staff PWA gates. */
export function jobRoleToPlatformRole(role: string | null | undefined): Role {
  const job = String(role ?? "").toUpperCase();
  if (job === "CLEANER") return "cleaner";
  if (job === "RECEPTION" || job === "RECEPTIONIST") return "receptionist";
  if (job === "WAITER") return "waiter";
  if (job === "MANAGER" || job === "ADMIN") return "hotel_staff";
  return "hotel_staff";
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
