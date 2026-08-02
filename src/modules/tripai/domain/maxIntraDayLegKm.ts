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
 * `samarqand` / `buxoro` / `xiva` are CONFIRMED. See per-entry notes for
 * geographic basis — do not silently re-tune without re-checking those notes.
 */
const MAX_INTRA_DAY_LEG_KM_BY_REGION: Readonly<Record<string, number>> = {
  /**
   * Locked. Tuned for Samarqand old-city cluster; Imom al-Buxoriy (~18 km from
   * Registon) stays outside consecutive slots.
   */
  samarqand: MAX_INTRA_DAY_LEG_KM,

  /**
   * CONFIRMED (Rustam, 2026-08-02): **8** (not 7).
   *
   * Why not 7: an earlier draft used an ad-hoc non-Site coordinate pair
   * (center ≈39.77556°N 64.41500°E; “chor” ≈39.8058°N 64.3833°E — chor was
   * shifted NE / wrong) that yielded ~4.3 km and suggested 7 with margin.
   * Against real Chor-Bakr (Wikipedia 39.77444°N 64.33444°E):
   *   → Ark ≈39.7775°N 64.4110°E : ~6.55 km
   *   → Kalyan ≈39.7756°N 64.4229°E : ~7.56 km
   * Threshold 7 is a coin-flip vs that span; 8 keeps Chor-Bakr in.
   * Naqshband (~10–14 km) stays out. Do not drop back to 7 without new coords.
   */
  buxoro: 8,

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
