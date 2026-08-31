/**
 * Where the header avatar should land for a platform role (work panel).
 * Personal settings use `profileHomeForRole` — do not mix the two.
 */
export function accountHomeForRole(role: string | null | undefined): string {
  const r = (role ?? "").toLowerCase();
  switch (r) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "hotel_manager":
      return "/hotel";
    case "home_stay_partner":
      return "/homestay-partner/dashboard";
    case "guide":
    case "guide_partner":
      return "/guide-partner/dashboard";
    case "taxi":
    case "taxi_partner":
      return "/taxi-partner";
    case "support":
      return "/support/dashboard";
    case "cleaner":
    case "receptionist":
    case "waiter":
    case "hotel_staff":
      return "/staff/dashboard";
    case "restaurant_manager":
      return "/restaurant";
    default:
      return "/profile";
  }
}

/**
 * Personal account / settings page for a role — stays inside that role's shell
 * when a partner portal exists (avoids jumping to the tourist `/profile` UI).
 */
export function profileHomeForRole(role: string | null | undefined): string {
  const r = (role ?? "").toLowerCase();
  switch (r) {
    case "guide":
    case "guide_partner":
      return "/guide-partner/profile";
    case "taxi":
    case "taxi_partner":
      return "/taxi-partner/profile";
    case "hotel_manager":
      return "/hotel/settings";
    case "home_stay_partner":
      return "/homestay-partner/dashboard";
    case "admin":
    case "super_admin":
      return "/admin/settings";
    case "support":
      return "/support/dashboard";
    default:
      return "/profile";
  }
}

export function isStaffPlatformRole(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return (
    r === "super_admin" ||
    r === "admin" ||
    r === "hotel_manager" ||
    r === "home_stay_partner" ||
    r === "guide" ||
    r === "guide_partner" ||
    r === "taxi" ||
    r === "taxi_partner" ||
    r === "support" ||
    r === "cleaner" ||
    r === "receptionist" ||
    r === "waiter" ||
    r === "hotel_staff" ||
    r === "restaurant_manager"
  );
}
