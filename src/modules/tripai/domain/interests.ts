import type { ClaimKind, SiteCategory } from "@/src/modules/knowledge";

const INTEREST_TO_CATEGORIES: Record<string, SiteCategory[]> = {
  history: ["OBIDA", "MADRASA", "MASJID", "MAQBARA", "MUZEY", "ARXEOLOGIYA"],
  culture: ["OBIDA", "MADRASA", "MASJID", "MAQBARA", "MUZEY", "BOZOR"],
  nature: ["TABIAT"],
  pilgrimage: ["ZIYORATGOH", "MASJID", "MAQBARA"],
  ziyorat: ["ZIYORATGOH", "MASJID", "MAQBARA"],
  market: ["BOZOR"],
  food: ["BOZOR"],
  architecture: ["OBIDA", "MADRASA", "MASJID", "MAQBARA", "ARXEOLOGIYA"],
};

const INTEREST_TO_KINDS: Record<string, ClaimKind[]> = {
  history: ["TARIX", "ARXITEKTURA"],
  culture: ["TARIX", "ARXITEKTURA", "AMALIY"],
  nature: ["AMALIY"],
  architecture: ["ARXITEKTURA"],
  folklore: ["RIVOYAT"],
  rivoyat: ["RIVOYAT"],
};

export function categoriesForInterests(interests: string[]): SiteCategory[] | null {
  if (!interests.length) return null;
  const set = new Set<SiteCategory>();
  for (const raw of interests) {
    const key = raw.trim().toLowerCase();
    const cats = INTEREST_TO_CATEGORIES[key];
    if (cats) for (const c of cats) set.add(c);
  }
  return set.size ? [...set] : null;
}

export function claimKindsForInterests(interests: string[]): ClaimKind[] | null {
  if (!interests.length) return null;
  const set = new Set<ClaimKind>();
  for (const raw of interests) {
    const key = raw.trim().toLowerCase();
    const kinds = INTEREST_TO_KINDS[key];
    if (kinds) for (const k of kinds) set.add(k);
  }
  return set.size ? [...set] : null;
}
