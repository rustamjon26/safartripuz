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
   * ⚠ The earlier ~4.3 km Chor-Bakr figure was **not** from Site rows (repo has
   * no published `buxoro` Sites yet). It came from an ad-hoc session pair:
   *   "center"  ≈ 39.77556°N 64.41500°E  (hand-picked Po-i-Kalyan-ish)
   *   "chor"    ≈ 39.8058°N  64.3833°E   (hand-picked — too far NE / wrong)
   * That under-shot open sources. Better public anchors:
   *   Chor-Bakr (Wikipedia): 39.77444°N 64.33444°E (39°46′28″N 64°20′4″E)
   *   → Ark ≈39.7775°N 64.4110°E : ~6.55 km
   *   → Kalyan ≈39.7756°N 64.4229°E : ~7.56 km
   * So 7 km is a knife-edge vs real Chor-Bakr; 8 km is the safer include.
   * Naqshband (~10–14 km) stays out at either 7 or 8.
   */
  buxoro: 7,

  /**
   * CONFIRMED (Rustam, 2026-08-02): Ichan-Qala walls ~2250 m / ~30 ha →
   * centre-to-edge ~0.4–0.6 km; Dishan-Qala (~240 ha) → ~1.1–1.4 km radius.
   * 3 km covers the oasis-town core with margin.
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
