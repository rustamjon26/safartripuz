import type { SiteProminence } from "@prisma/client";

/** Lower rank = higher priority in the plan. Null / unknown → lowest. */
export function prominenceRank(
  prominence: SiteProminence | null | undefined,
): number {
  if (prominence === "PRIMARY") return 0;
  if (prominence === "SECONDARY") return 1;
  return 2;
}

/** Sort key: prominence first, then name (stable within a tier). */
export function compareByProminence(
  a: { prominence?: SiteProminence | null; name: string },
  b: { prominence?: SiteProminence | null; name: string },
): number {
  const byRank = prominenceRank(a.prominence) - prominenceRank(b.prominence);
  if (byRank !== 0) return byRank;
  return a.name.localeCompare(b.name, "en");
}

export function sortByProminence<
  T extends { prominence?: SiteProminence | null; name: string },
>(items: T[]): T[] {
  return [...items].sort(compareByProminence);
}
