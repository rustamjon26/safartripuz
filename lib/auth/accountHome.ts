/**
 * Where the header/sidebar avatar should land for a platform role.
 * Personal `/profile` stays available via nav — avatar returns to the role home.
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
