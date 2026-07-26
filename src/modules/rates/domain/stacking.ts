import type { PromotionRule } from "./types";

/**
 * Select promotions to apply: sort by priority ascending, skip stackGroup conflicts
 * unless combinableWith allows. No hard-coded promo codes.
 */
export function selectStackablePromotions(promotions: PromotionRule[]): PromotionRule[] {
  const sorted = [...promotions].sort((a, b) => a.priority - b.priority);
  const usedGroups = new Set<string>();
  const selected: PromotionRule[] = [];

  for (const promo of sorted) {
    const conflicts = [...usedGroups].some((g) => {
      if (g === promo.stackGroup) return true;
      // existing group must list this promo's group as combinable, and vice versa
      const existing = selected.find((p) => p.stackGroup === g);
      if (!existing) return true;
      const aOk = existing.combinableWith.includes(promo.stackGroup);
      const bOk = promo.combinableWith.includes(g);
      return !(aOk && bOk);
    });

    if (usedGroups.has(promo.stackGroup)) {
      continue; // same group: first (higher priority / lower number) wins
    }
    if (conflicts && usedGroups.size > 0) {
      // Check combinability with all used groups
      const ok = [...usedGroups].every((g) => {
        const existing = selected.find((p) => p.stackGroup === g)!;
        return (
          existing.combinableWith.includes(promo.stackGroup) &&
          promo.combinableWith.includes(g)
        );
      });
      if (!ok) continue;
    }

    selected.push(promo);
    usedGroups.add(promo.stackGroup);
  }

  return selected;
}
