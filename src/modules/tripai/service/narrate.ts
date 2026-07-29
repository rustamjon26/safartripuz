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
    "- You may only name sites listed in the schedule.",
    "- Output plain text paragraphs, no markdown tables, no JSON.",
  ].join("\n");
}

export async function narrateSchedule(input: {
  regionDisplay: string;
  lang: TripLang;
  days: DaySchedule[];
  catalogNames: string[];
}): Promise<{ text: string; source: "llm" | "template" }> {
  const allowed = input.days.flatMap((d) => d.slots.map((s) => s.siteName));
  const catalog = [...new Set([...input.catalogNames, ...LANDMARK_ALIASES, ...allowed])];

  const template = () =>
    buildTemplateNarration({
      regionDisplay: input.regionDisplay,
      lang: input.lang,
      days: input.days.map((d) => ({
        day: d.day,
        slots: d.slots.map((s) => ({
          siteName: s.siteName,
          startTime: s.startTime,
        })),
      })),
    });

  const payload = {
    region: input.regionDisplay,
    language: LANG_LABEL[input.lang],
    schedule: input.days.map((d) => ({
      day: d.day,
      date: d.date,
      stops: d.slots.map((s) => ({
        time: `${s.startTime}-${s.endTime}`,
        site: s.siteName,
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
