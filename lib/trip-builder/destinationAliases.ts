/**
 * Expand a destination label into search tokens for city/region filters.
 * "Zomin" must also match partner-entered "Zaamin", Cyrillic, etc.
 */

const GROUPS: string[][] = [
  ["zomin", "zaamin", "зомин", "za'min", "zo'min", "zaamin national"],
  ["samarqand", "samarkand", "самарканд"],
  ["buxoro", "bukhara", "бухара"],
  ["xiva", "khiva", "хива"],
  ["toshkent", "tashkent", "ташкент"],
  ["jizzax", "jizzakh", "джизак"],
];

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`ʼ]/g, "'");
}

/** Distinct lowercase tokens to use in Prisma `contains` filters. */
export function destinationSearchTerms(input: string | null | undefined): string[] {
  const key = normalizeKey(input ?? "");
  if (!key) return [];

  for (const group of GROUPS) {
    const hit = group.some(
      (alias) => key === alias || key.includes(alias) || alias.includes(key),
    );
    if (hit) {
      return [...new Set(group.map((a) => a.toLowerCase()))];
    }
  }

  return [key];
}

/** Prisma OR clauses: city contains any alias. */
export function cityContainsAny(terms: string[]): Array<{ city: { contains: string } }> {
  return terms.map((t) => ({ city: { contains: t } }));
}

/** Prisma OR clauses: city OR region contains any alias. */
export function cityOrRegionContainsAny(
  terms: string[],
): Array<{ city: { contains: string } } | { region: { contains: string } }> {
  return terms.flatMap((t) => [
    { city: { contains: t } },
    { region: { contains: t } },
  ]);
}
