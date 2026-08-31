import { haversine } from "./distance";
import type { ScheduleCandidateInput } from "./types";

function hasCoords(c: ScheduleCandidateInput): boolean {
  return (
    c.lat != null &&
    c.lng != null &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng)
  );
}

function distanceKm(
  a: ScheduleCandidateInput,
  b: ScheduleCandidateInput,
): number {
  if (!hasCoords(a) || !hasCoords(b)) return Number.POSITIVE_INFINITY;
  return haversine(a.lat!, a.lng!, b.lat!, b.lng!);
}

/**
 * Core anchors for day-trip detection: PRIMARY sites with coordinates.
 * Without a PRIMARY cluster we do not auto-classify day-trips (avoids
 * false positives in thin catalogs).
 */
export function primaryCoreAnchors(
  candidates: ScheduleCandidateInput[],
): ScheduleCandidateInput[] {
  return candidates.filter(
    (c) => c.prominence === "PRIMARY" && hasCoords(c),
  );
}

/**
 * Min haversine km from `site` to the nearest PRIMARY core anchor.
 * Infinity when site or all anchors lack coords.
 */
export function distanceToPrimaryCoreKm(
  site: ScheduleCandidateInput,
  anchors: ScheduleCandidateInput[],
): number {
  if (!hasCoords(site) || anchors.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let best = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    const d = distanceKm(site, a);
    if (d < best) best = d;
  }
  return best;
}

/**
 * A site is a day-trip when it cannot share a day with the PRIMARY cluster
 * under the intra-day leg budget — i.e. farther than `maxIntraDayLegKm` from
 * every PRIMARY anchor.
 *
 * Editorial override via `isDayTrip`:
 * - `true` → force day-trip (even if PRIMARY / near core)
 * - `false` → never day-trip
 * - unset → auto from distance
 *
 * PRIMARY sites are never auto day-trips (they define the core).
 */
export function isDayTripCandidate(
  site: ScheduleCandidateInput,
  anchors: ScheduleCandidateInput[],
  maxIntraDayLegKm: number,
): boolean {
  if (site.isDayTrip === true) return true;
  if (site.isDayTrip === false) return false;
  if (site.prominence === "PRIMARY") return false;
  if (!hasCoords(site) || anchors.length === 0) return false;
  return distanceToPrimaryCoreKm(site, anchors) > maxIntraDayLegKm;
}

export function classifyDayTripIds(
  candidates: ScheduleCandidateInput[],
  maxIntraDayLegKm: number,
): Set<string> {
  const anchors = primaryCoreAnchors(candidates);
  const ids = new Set<string>();
  for (const c of candidates) {
    if (isDayTripCandidate(c, anchors, maxIntraDayLegKm)) {
      ids.add(c.id);
    }
  }
  return ids;
}

/**
 * How many day-starts to reserve for day-trip sites.
 *
 * - `< 3` days: 0 (short trips keep PRIMARY-only opens)
 * - `3` days: at most 1 (so Imom-class sites are reachable in common 3×3 plans)
 * - `4+` days: up to `dayCount - 2` (keep ≥2 core days for the PRIMARY cluster)
 */
export function dayTripStartBudget(
  dayCount: number,
  dayTripCount: number,
): number {
  if (dayCount < 3 || dayTripCount <= 0) return 0;
  if (dayCount === 3) return Math.min(1, dayTripCount);
  return Math.min(dayTripCount, dayCount - 2);
}

/**
 * Day indexes (0-based) that should open with a day-trip when possible.
 * Prefers later days so early days fill the historic core.
 */
export function reservedDayTripStartIndexes(
  dayCount: number,
  budget: number,
): Set<number> {
  const out = new Set<number>();
  if (budget <= 0 || dayCount <= 0) return out;
  const n = Math.min(budget, dayCount);
  for (let i = dayCount - n; i < dayCount; i++) {
    out.add(i);
  }
  return out;
}
