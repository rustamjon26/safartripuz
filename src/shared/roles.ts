import type { Role } from "@prisma/client";

/**
 * The platform role list, duplicated as plain data because Next.js middleware
 * runs on the Edge runtime and cannot import `@prisma/client` at runtime.
 * `RolesMatchPrismaEnum` below fails the build the moment this list and the
 * Prisma `Role` enum disagree, so the duplication cannot silently rot.
 */
export const ROLES = [
  "super_admin",
  "admin",
  "user",
  "taxi",
  "taxi_partner",
  "hotel_manager",
  "guide",
  "guide_partner",
  "restaurant_manager",
  "home_stay_partner",
  "support",
  "cleaner",
  "receptionist",
  "waiter",
  "hotel_staff",
] as const;

export type AppRole = (typeof ROLES)[number];

type MustBeTrue<T extends true> = T;
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Compile-time proof that ROLES is exactly the Prisma `Role` enum. */
export type RolesMatchPrismaEnum = MustBeTrue<Exact<AppRole, Role>>;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Guide panel access. `guide` is what admins have historically assigned;
 * `guide_partner` is the explicit value. Both mean the same operator.
 */
export const GUIDE_PANEL_ROLES = ["guide", "guide_partner"] as const;

/** Taxi panel access — `taxi` predates `taxi_partner`, same operator. */
export const TAXI_PANEL_ROLES = ["taxi", "taxi_partner"] as const;

export function isGuidePanelRole(role: string): role is (typeof GUIDE_PANEL_ROLES)[number] {
  return (GUIDE_PANEL_ROLES as readonly string[]).includes(role);
}

export function isTaxiPanelRole(role: string): role is (typeof TAXI_PANEL_ROLES)[number] {
  return (TAXI_PANEL_ROLES as readonly string[]).includes(role);
}
