import type { OpeningHours, Weekday, WeeklyHours } from "./types";

const WEEKDAYS_ALL: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAYS_WORK: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

const DAY_TOKEN_TO_WEEKDAY: Record<string, Weekday> = {
  du: "mon",
  se: "tue",
  ch: "wed",
  pa: "thu",
  ju: "fri",
  sh: "sat",
  ya: "sun",
};

const DAY_TOKEN = "Du|Se|Ch|Pa|Ju|Sh|Ya";
const DAY_SPEC_RE = new RegExp(
  `\\b((?:${DAY_TOKEN})(?:\\s*[-–,]\\s*(?:${DAY_TOKEN}))*)\\s+(\\d{1,2}:\\d{2})\\s*[-–—]\\s*(\\d{1,2}:\\d{2})`,
  "gi",
);
const BARE_RANGE_RE = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/;
const CLOSED_WEEKENDS_RE = /dam\s*olish\s*kunlari\s*yopiq/i;
const SUNDAY_CLOSED_RE = /\b(?:yakshanba|ya)\s+yopiq\b/i;
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

/**
 * Normalize open/close for storage.
 * Close `00:00` with a non-midnight open is overnight-to-midnight
 * (handled by isOpenAt when open > close).
 */
function normalizeRange(
  label: string,
  openRaw: string,
  closeRaw: string,
): readonly [string, string] {
  const open = assertHmm(label, openRaw);
  const close = assertHmm(label, closeRaw);
  return [open, close];
}

function emptyWeekly(): WeeklyHours {
  const weekly: WeeklyHours = {};
  for (const day of WEEKDAYS_ALL) weekly[day] = [];
  return weekly;
}

function weeklyForDays(
  days: Weekday[],
  open: string,
  close: string,
): WeeklyHours {
  const weekly = emptyWeekly();
  for (const day of days) {
    weekly[day] = [[open, close]];
  }
  return weekly;
}

function weeklyAlwaysOpen(): WeeklyHours {
  return weeklyForDays(WEEKDAYS_ALL, "00:00", "23:59");
}

/** Expand "Du-Ju" (range) or "Sh, Ya" / "Sh-Ya" (list or range). */
export function expandDaySpec(spec: string): Weekday[] {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new Error(`Empty day spec in open hours`);
  }

  const parts = trimmed
    .split(/\s*[-–,]\s*/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const mapped: Weekday[] = [];
  for (const part of parts) {
    const day = DAY_TOKEN_TO_WEEKDAY[part];
    if (!day) {
      throw new Error(`Unknown day token "${part}" in open hours`);
    }
    mapped.push(day);
  }

  const isHyphenRange =
    parts.length === 2 && /[-–]/.test(trimmed) && !/,/.test(trimmed);

  if (isHyphenRange) {
    const start = WEEKDAYS_ALL.indexOf(mapped[0]!);
    const end = WEEKDAYS_ALL.indexOf(mapped[1]!);
    if (start < 0 || end < 0) {
      throw new Error(`Invalid day range "${trimmed}"`);
    }
    if (start <= end) {
      return WEEKDAYS_ALL.slice(start, end + 1);
    }
    // Wrap across week (rare): Du after Ya
    return [...WEEKDAYS_ALL.slice(start), ...WEEKDAYS_ALL.slice(0, end + 1)];
  }

  return [...new Set(mapped)];
}

/**
 * Parse free-text open hours into machine JSON.
 * Empty / null → `{ raw: null, parsed: null }`.
 * Unrecognized non-empty text → throws (never silent null).
 *
 * Supports:
 * - Simple range: "09:00 - 19:00" (all week)
 * - Overnight: "09:00 - 00:00", "11:00 - 02:00"
 * - Per-day: "Du-Ju 07:00 - 22:00, Sh-Ya 09:00 - 22:00"
 * - Sunday closed: "Du-Sh 09:00 - 18:00, yakshanba yopiq"
 * - Weekends closed: "09:00 - 18:00, dam olish kunlari yopiq"
 * - 24/7
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

  const weekly = emptyWeekly();
  let placedRange = false;

  DAY_SPEC_RE.lastIndex = 0;
  let dayMatch: RegExpExecArray | null;
  while ((dayMatch = DAY_SPEC_RE.exec(normalized)) !== null) {
    const days = expandDaySpec(dayMatch[1] ?? "");
    const [open, close] = normalizeRange(
      trimmed,
      dayMatch[2] ?? "",
      dayMatch[3] ?? "",
    );
    for (const day of days) {
      weekly[day] = [[open, close]];
    }
    placedRange = true;
  }

  const sundayClosed = SUNDAY_CLOSED_RE.test(normalized);
  const weekendsClosed = CLOSED_WEEKENDS_RE.test(normalized);

  if (!placedRange) {
    const bare = BARE_RANGE_RE.exec(normalized);
    if (!bare) {
      if (weekendsClosed || sundayClosed) {
        throw new Error(
          `Open hours "${trimmed}" marks a closed day but has no time range (e.g. "09:00 - 19:00")`,
        );
      }
      throw new Error(`Unrecognized open hours: "${trimmed}"`);
    }

    const [open, close] = normalizeRange(trimmed, bare[1] ?? "", bare[2] ?? "");
    const days = weekendsClosed
      ? WEEKDAYS_WORK
      : sundayClosed
        ? WEEKDAYS_ALL.filter((d) => d !== "sun")
        : WEEKDAYS_ALL;
    for (const day of days) {
      weekly[day] = [[open, close]];
    }
    placedRange = true;
  } else {
    if (weekendsClosed) {
      weekly.sat = [];
      weekly.sun = [];
    }
    if (sundayClosed) {
      weekly.sun = [];
    }
  }

  if (!placedRange) {
    throw new Error(`Unrecognized open hours: "${trimmed}"`);
  }

  return {
    raw: trimmed,
    parsed: { weekly },
  };
}
