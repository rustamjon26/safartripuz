/**
 * Map HotelStaff.job roles (CLEANER/RECEPTION/…) and platform User.role
 * strings onto the lowercase keys used by hotel nav `roles` arrays.
 */
export function normalizeHotelNavRole(
  staffRole: string | null | undefined,
  userRole: string | null | undefined,
): string {
  const raw = (staffRole || userRole || "user").trim();
  switch (raw.toUpperCase()) {
    case "CLEANER":
      return "cleaner";
    case "RECEPTION":
    case "RECEPTIONIST":
      return "receptionist";
    case "WAITER":
      return "waiter";
    case "MANAGER":
    case "HOTEL_MANAGER":
      return "hotel_manager";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "admin";
    default:
      return raw.toLowerCase();
  }
}
