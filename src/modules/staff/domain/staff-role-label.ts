/** HotelStaff.role → Uzbek display title for Staff PWA profile. */
export function staffRoleTitle(role: string | null | undefined): string {
  const r = (role ?? "").toUpperCase();
  switch (r) {
    case "CLEANER":
      return "Farrosh";
    case "RECEPTION":
    case "RECEPTIONIST":
      return "Retsepsionist";
    case "WAITER":
      return "Ofitsiant";
    case "MANAGER":
      return "Menejer";
    case "ADMIN":
      return "Administrator";
    case "STAFF":
      return "Xodim";
    default:
      return r ? r.charAt(0) + r.slice(1).toLowerCase() : "Xodim";
  }
}

export function initialsFromName(firstName: string, lastName: string | null): string {
  const a = firstName.trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

/** Month-over-month growth label for completed tasks. */
export function growthLabel(current: number, previous: number): string {
  if (previous <= 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}
