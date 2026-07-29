import { LANDMARK_ALIASES } from "./landmarks";

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pure narration validator.
 * If the text mentions a place from `catalog` that is not in `allowedSiteNames`,
 * the narration is rejected (LLM invented or pulled an off-schedule site).
 */
export function findDisallowedMentions(
  narration: string,
  allowedSiteNames: string[],
  catalog: string[] = LANDMARK_ALIASES,
): string[] {
  const allowed = new Set(allowedSiteNames.map(normalizeName));
  const text = narration.toLowerCase();
  const hits: string[] = [];
  const seen = new Set<string>();

  for (const name of catalog) {
    const key = normalizeName(name);
    if (!key || key.length < 3) continue;
    if (allowed.has(key)) continue;
    if (seen.has(key)) continue;
    if (text.includes(key)) {
      hits.push(name);
      seen.add(key);
    }
  }

  // Also treat allowed-list peers: any allowed name's catalog sibling is fine;
  // additionally flag catalog entries that appear as whole-word-ish substrings.
  return hits;
}

export function narrationIsValid(
  narration: string,
  allowedSiteNames: string[],
  catalog?: string[],
): boolean {
  return findDisallowedMentions(narration, allowedSiteNames, catalog).length === 0;
}

export function buildTemplateNarration(input: {
  regionDisplay: string;
  lang: "uz" | "ru" | "en";
  days: Array<{ day: number; slots: Array<{ siteName: string; startTime: string }> }>;
}): string {
  const lines: string[] = [];
  if (input.lang === "ru") {
    lines.push(`Маршрут по региону ${input.regionDisplay} (шаблон, без LLM):`);
  } else if (input.lang === "en") {
    lines.push(`Itinerary for ${input.regionDisplay} (template, no LLM):`);
  } else {
    lines.push(`${input.regionDisplay} bo‘yicha reja (shablon, LLM siz):`);
  }

  for (const day of input.days) {
    const stops = day.slots.map((s) => `${s.startTime} — ${s.siteName}`).join("; ");
    lines.push(
      input.lang === "en"
        ? `Day ${day.day}: ${stops || "No stops scheduled."}`
        : input.lang === "ru"
          ? `День ${day.day}: ${stops || "Остановок нет."}`
          : `${day.day}-kun: ${stops || "To‘xtash joylari yo‘q."}`,
    );
  }
  return lines.join("\n");
}
