import type { DaySchedule, TripLang } from "../domain/types";
import {
  buildTemplateNarration,
  narrationIsValid,
} from "../domain/narrationGuard";
import { LANDMARK_ALIASES } from "../domain/landmarks";
import { chatCompletions } from "./llm.client";

const LANG_LABEL: Record<TripLang, string> = {
  uz: "Uzbek (Latin script)",
  ru: "Russian",
  en: "English",
};

export function buildNarrationSystemPrompt(): string {
  return [
    "You are SafarTrip narrative assistant.",
    "You receive a finished day-by-day schedule of real sites.",
    "Write short connective prose only (transitions, pacing tips).",
    "HARD RULES:",
    "- Do NOT introduce any place, attraction, price, date, or historical fact",
    "  that is not explicitly present in the user JSON.",
    "- Do NOT invent restaurants, hotels, or transport options.",
    "- You may only name sites listed in the schedule stops.",
    "- Days with an empty stops array (or fewer stops than other days) mean we",
    "  lack verified places for those slots. Do NOT invent filler attractions,",
    "  markets, or \"free time\" destinations. You may briefly note a lighter day",
    "  using only the stops that are listed.",
    "- Output plain text paragraphs, no markdown tables, no JSON.",
  ].join("\n");
}

/** LLM / template input: NO_DATA slots are stripped (never null site names). */
export function buildNarrationLlmPayload(input: {
  regionDisplay: string;
  lang: TripLang;
  days: DaySchedule[];
}): {
  region: string;
  language: string;
  schedule: Array<{
    day: number;
    date: string;
    stops: Array<{
      time: string;
      site: string;
      claims: unknown[];
    }>;
  }>;
} {
  return {
    region: input.regionDisplay,
    language: LANG_LABEL[input.lang],
    schedule: input.days.map((d) => ({
      day: d.day,
      date: d.date,
      stops: d.slots
        .filter((s) => s.status === "PLACED" && s.siteName != null)
        .map((s) => ({
          time: `${s.startTime}-${s.endTime}`,
          site: s.siteName as string,
          claims: s.claims
            .filter((c) => c.established || c.folklore || c.level === "NIZOLI")
            .map((c) => ({
              level: c.level,
              text: c.text,
              folklore: c.folklore,
              positions: c.positions?.map((p) => ({
                label: p.label,
                text: p.text,
              })),
            })),
        })),
    })),
  };
}

export async function narrateSchedule(input: {
  regionDisplay: string;
  lang: TripLang;
  days: DaySchedule[];
  catalogNames: string[];
}): Promise<{ text: string; source: "llm" | "template" }> {
  const placedSlots = input.days.flatMap((d) =>
    d.slots.filter((s) => s.status === "PLACED" && s.siteName != null),
  );
  const allowed = placedSlots.map((s) => s.siteName as string);
  const catalog = [
    ...new Set([...input.catalogNames, ...LANDMARK_ALIASES, ...allowed]),
  ];

  const template = () =>
    buildTemplateNarration({
      regionDisplay: input.regionDisplay,
      lang: input.lang,
      days: input.days.map((d) => ({
        day: d.day,
        slots: d.slots
          .filter((s) => s.status === "PLACED" && s.siteName != null)
          .map((s) => ({
            siteName: s.siteName as string,
            startTime: s.startTime,
          })),
      })),
    });

  const payload = buildNarrationLlmPayload({
    regionDisplay: input.regionDisplay,
    lang: input.lang,
    days: input.days,
  });

  const attempt = async (): Promise<string | null> => {
    const raw = await chatCompletions(
      [
        { role: "system", content: buildNarrationSystemPrompt() },
        {
          role: "user",
          content: `Write the narration in ${LANG_LABEL[input.lang]}.\n\n${JSON.stringify(payload)}`,
        },
      ],
      { temperature: 0.3, maxTokens: 1000 },
    );
    if (!raw) return null;
    if (!narrationIsValid(raw, allowed, catalog)) return null;
    return raw;
  };

  const first = await attempt();
  if (first) return { text: first, source: "llm" };

  const second = await attempt();
  if (second) return { text: second, source: "llm" };

  return { text: template(), source: "template" };
}
