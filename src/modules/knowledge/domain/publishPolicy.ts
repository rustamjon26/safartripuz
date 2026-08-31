import { parseDining } from "./dining";
import { DINING_CATEGORIES } from "./tourismData";
import type { SiteCategory, SiteStatus } from "./types";

export type SiteProminenceValue = "PRIMARY" | "SECONDARY" | "OPTIONAL";

export type PublishBlockReason =
  | "already_published"
  | "archived"
  | "missing_source_url"
  | "missing_coordinates"
  | "missing_opening_hours"
  | "missing_prominence"
  | "dining_incomplete"
  | "dining_on_nondining";

export type PublishSiteSnapshot = {
  status: SiteStatus;
  category: SiteCategory;
  sourceUrl: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  openingHours: unknown;
  dining: unknown;
  /** Editorial rank; null/unknown fails the gate (do not invent). */
  prominence: string | null | undefined;
};

export type PublishEligibility = {
  ok: boolean;
  reasons: PublishBlockReason[];
};

export function isDiningCategory(category: SiteCategory): boolean {
  return (DINING_CATEGORIES as readonly string[]).includes(category);
}

/** True when stored openingHours has at least one non-empty weekday range. */
export function hasUsableOpeningHours(openingHours: unknown): boolean {
  if (openingHours == null || typeof openingHours !== "object") return false;
  const weekly = (openingHours as { weekly?: unknown }).weekly;
  if (weekly == null || typeof weekly !== "object") return false;
  return Object.values(weekly as Record<string, unknown>).some(
    (ranges) => Array.isArray(ranges) && ranges.length > 0,
  );
}

/**
 * Editorial publish gate for knowledge Sites.
 *
 * - Seed path must never call this to write PUBLISHED (see seedKnowledge).
 * - Dining (RESTORAN/CHAYXONA/KAFE): need planner-grade dining
 *   (`priceBand` + non-empty `mealTypes`) via {@link parseDining}.
 * - Non-dining incl. **BOSHQA**: dining JSON must be absent/null; BOSHQA is
 *   never special-cased to auto-skip other gates — same source/geo/hours/
 *   prominence bar as landmarks (catch-all still needs editorial completeness).
 * - Empty `sourceUrl` always blocks (trust model).
 */
export function evaluatePublishEligibility(
  site: PublishSiteSnapshot,
): PublishEligibility {
  const reasons: PublishBlockReason[] = [];

  if (site.status === "PUBLISHED") {
    reasons.push("already_published");
  }
  if (site.status === "ARCHIVED") {
    reasons.push("archived");
  }

  const sourceUrl = site.sourceUrl?.trim() ?? "";
  if (!sourceUrl) {
    reasons.push("missing_source_url");
  }

  if (
    site.lat == null ||
    site.lng == null ||
    !Number.isFinite(site.lat) ||
    !Number.isFinite(site.lng)
  ) {
    reasons.push("missing_coordinates");
  }

  if (!hasUsableOpeningHours(site.openingHours)) {
    reasons.push("missing_opening_hours");
  }

  if (
    site.prominence !== "PRIMARY" &&
    site.prominence !== "SECONDARY" &&
    site.prominence !== "OPTIONAL"
  ) {
    reasons.push("missing_prominence");
  }

  const dining = isDiningCategory(site.category);
  if (dining) {
    if (parseDining(site.dining) == null) {
      reasons.push("dining_incomplete");
    }
  } else if (site.dining != null) {
    reasons.push("dining_on_nondining");
  }

  return { ok: reasons.length === 0, reasons };
}

export function formatPublishBlockedMessage(
  slugOrId: string,
  reasons: PublishBlockReason[],
): string {
  return `Site "${slugOrId}" cannot be PUBLISHED: ${reasons.join(", ")}`;
}
