import type { SupportPartyType } from "./types";

/** Map platform User.role → support chat party bucket. */
export function partyTypeFromRole(
  role: string | null | undefined,
): SupportPartyType {
  switch (role) {
    case "hotel_manager":
      return "hotel";
    case "home_stay_partner":
      return "homestay";
    case "taxi":
    case "taxi_partner":
      return "taxi";
    case "guide":
    case "guide_partner":
      return "guide";
    default:
      return "customer";
  }
}

export function partyTypeLabel(type: SupportPartyType): string {
  switch (type) {
    case "hotel":
      return "Mehmonxona";
    case "homestay":
      return "Uy mehmonxona";
    case "taxi":
      return "Taxi";
    case "guide":
      return "Gid";
    case "customer":
      return "Mijoz";
    default:
      return type;
  }
}

export function isSupportAgentRole(role: string | null | undefined): boolean {
  return role === "support" || role === "admin" || role === "super_admin";
}
