import type { ClaimLevel, DeriveClaimLevelInput, SourceTier } from "./types";

function backedPositionIds(
  sources: DeriveClaimLevelInput["sources"],
): Set<string> {
  const ids = new Set<string>();
  for (const s of sources) {
    if (s.positionId) ids.add(s.positionId);
  }
  return ids;
}

function distinctPublishersForTier(
  sources: DeriveClaimLevelInput["sources"],
  tier: SourceTier,
): Set<string> {
  const keys = new Set<string>();
  for (const s of sources) {
    if (s.tier !== tier) continue;
    const key = s.publisherKey.trim();
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * Pure claim confidence from attached sources / positions.
 * Independence for TASDIQLANGAN is distinct publisherKey among A_RASMIY —
 * not the number of ClaimSource rows.
 */
export function deriveClaimLevel(input: DeriveClaimLevelInput): ClaimLevel {
  const { sources, positions, isFolklore } = input;

  const backed = backedPositionIds(sources);
  if (positions.length > 1 && backed.size > 1) {
    return "NIZOLI";
  }

  if (isFolklore) {
    return "OGZAKI_RIVOYAT";
  }

  if (distinctPublishersForTier(sources, "A_RASMIY").size >= 2) {
    return "TASDIQLANGAN";
  }

  if (distinctPublishersForTier(sources, "B_ILMIY").size >= 1) {
    return "ILMIY_MANBA";
  }

  return "TASDIQLANMAGAN";
}
