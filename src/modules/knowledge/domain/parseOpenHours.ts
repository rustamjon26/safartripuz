import type { OpeningHours, Weekday, WeeklyHours } from "./types";

const WEEKDAYS_ALL: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAYS_WORK: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

const RANGE_RE = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/;
const CLOSED_WEEKENDS_RE = /dam\s*olish\s*kunlari\s*yopiq/i;
const ALWAYS_OPEN_RE = /^(24\s*\/\s*7|24x7|kuniga\s*24\s*soat)$/i;

export type StoredOpeningHours = {
  raw: string | null;
  parsed: OpeningHours | null;
};

function assertHmm(label: string, value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) {
    throw new Error(`Invalid time "${value}" in open hours (${label})`);
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    throw new Error(`Out-of-range time "${value}" in open hours (${label})`);
  }
  return `${h.toString().padStart(2, "0")}:${m[2]}`;
}

function weeklyForDays(days: Weekday[], open: string, close: string): WeeklyHours {
  const weekly: WeeklyHours = {};
  for (const day of WEEKDAYS_ALL) {
    weekly[day] = days.includes(day) ? [[open, close]] : [];
  }
  return weekly;
}

function weeklyAlwaysOpen(): WeeklyHours {
  return weeklyForDays(WEEKDAYS_ALL, "00:00", "23:59");
}

/**
 * Parse free-text open hours into machine JSON.
 * Empty / null → `{ raw: null, parsed: null }`.
 * Unrecognized non-empty text → throws (never silent null).
 */
export function parseOpenHours(raw: string | null | undefined): StoredOpeningHours {
  if (raw == null) {
    return { raw: null, parsed: null };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { raw: null, parsed: null };
  }

  const normalized = trimmed.replace(/\s+/g, " ");

  if (ALWAYS_OPEN_RE.test(normalized)) {
    return {
      raw: trimmed,
      parsed: { weekly: weeklyAlwaysOpen() },
    };
  }

  const closedWeekends = CLOSED_WEEKENDS_RE.test(normalized);
  const rangeMatch = RANGE_RE.exec(normalized);

  if (rangeMatch) {
    const open = assertHmm(trimmed, rangeMatch[1] ?? "");
    const close = assertHmm(trimmed, rangeMatch[2] ?? "");
    const days = closedWeekends ? WEEKDAYS_WORK : WEEKDAYS_ALL;
    return {
      raw: trimmed,
      parsed: { weekly: weeklyForDays(days, open, close) },
    };
  }

  if (closedWeekends) {
    throw new Error(
      `Open hours "${trimmed}" says weekends are closed but has no time range (e.g. "09:00 - 19:00")`,
    );
  }

  throw new Error(`Unrecognized open hours: "${trimmed}"`);
}
