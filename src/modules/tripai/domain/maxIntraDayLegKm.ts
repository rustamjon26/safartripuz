/**
 * Per-region max haversine km between consecutive PLACED stops (slots 2+).
 *
 * This is the **distance filter cutoff only**. Travel-time math
 * ({@link travelMinutesBetween} ~20 km/h, clamp [10, 90]) is a separate path
 * and must not be derived from these values.
 *
 * Canonical keys match {@link normalizeRegion} / `Site.regionCode`
 * (`samarqand`, `buxoro`, `xiva`, …) — not English display names.
 */

/** Locked Samarqand / DEFAULT value — regression guard; do not re-tune. */
export const MAX_INTRA_DAY_LEG_KM = 12;

/**
 * regionCode → max consecutive intra-day leg (km).
 *
 * Values for `buxoro` and `xiva` are **PROPOSED — needs Rustam's confirmation
 * before treating as final**. See comments on each entry for geographic basis.
 */
const MAX_INTRA_DAY_LEG_KM_BY_REGION: Readonly<Record<string, number>> = {
  /**
   * Locked. Tuned for Samarqand old-city cluster; Imom al-Buxoriy (~18 km from
   * Registon) stays outside consecutive slots.
   */
  samarqand: MAX_INTRA_DAY_LEG_KM,

  /**
   * PROPOSED — needs Rustam's confirmation before treating as final.
   *
   * Basis (haversine from Po-i-Kalyan ≈ 39.776°N 64.415°E):
   * - UNESCO historic core (Ark / Lyabi-Hauz / Samanid): ≤ ~1.3 km
   * - Chor-Bakr necropolis: ~4.3 km (include as same-day city circuit)
   * - Bahoutdin Naqshband (Kasri Orifon): ~14.3 km (exclude as day-trip,
   *   analogous to Imom vs Samarqand)
   *
   * 7 km = Chor-Bakr + ~2.5 km operational margin; still well below Naqshband.
   */
  buxoro: 7,

  /**
   * PROPOSED — needs Rustam's confirmation before treating as final.
   *
   * Basis (Ichan-Kala tourist footprint):
   * - Walled Ichan-Kala west–east span: ~0.6 km
   * - Nurullabay / near Dishan-Kala fringes: ~0.7–1.4 km from Ichan centre
   * - Entire walkable tourist Khiva diameter: roughly ≤ 2 km
   *
   * 3 km covers the published oasis-town core with margin; far larger than
   * the historic walls but still clearly distinct from Samarqand's 12.
   */
  xiva: 3,
};

const warnedUnmapped = new Set<string>();

/**
 * Resolve the intra-day consecutive-leg distance filter for a region.
 * Unmapped codes fall back to {@link MAX_INTRA_DAY_LEG_KM} (12) and warn once
 * per process (not silent).
 */
export function getMaxIntraDayLegKm(regionCode: string): number {
  const key = String(regionCode ?? "")
    .trim()
    .toLowerCase();
  const mapped = MAX_INTRA_DAY_LEG_KM_BY_REGION[key];
  if (mapped != null) {
    return mapped;
  }
  if (!warnedUnmapped.has(key)) {
    warnedUnmapped.add(key);
    console.warn(
      `[tripai] getMaxIntraDayLegKm: unmapped regionCode "${regionCode}" — falling back to default ${MAX_INTRA_DAY_LEG_KM} km`,
    );
  }
  return MAX_INTRA_DAY_LEG_KM;
}

/** Test-only: clear the once-per-process unmapped warning set. */
export function resetMaxIntraDayLegKmWarnStateForTests(): void {
  warnedUnmapped.clear();
}
