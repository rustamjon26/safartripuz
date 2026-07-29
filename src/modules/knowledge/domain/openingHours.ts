import type { OpeningHours, TimeRange, Weekday, WeeklyHours } from "./types";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatMonthDay(d: Date): string {
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseHmm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function weekdayOf(d: Date): Weekday {
  return WEEKDAYS[d.getDay()] ?? "mon";
}

/** Inclusive seasonal window on MM-DD, wrapping across year end when from > to. */
export function isInSeasonalWindow(monthDay: string, from: string, to: string): boolean {
  if (from <= to) {
    return monthDay >= from && monthDay <= to;
  }
  return monthDay >= from || monthDay <= to;
}

function resolveWeekly(hours: OpeningHours, at: Date): WeeklyHours {
  const md = formatMonthDay(at);
  for (const season of hours.seasonal ?? []) {
    if (isInSeasonalWindow(md, season.from, season.to)) {
      return season.weekly;
    }
  }
  return hours.weekly;
}

function isWithinRanges(minuteOfDay: number, ranges: TimeRange[]): boolean {
  for (const [open, close] of ranges) {
    const a = parseHmm(open);
    const b = parseHmm(close);
    if (a == null || b == null) continue;
    if (a <= b) {
      if (minuteOfDay >= a && minuteOfDay < b) return true;
    } else {
      // overnight
      if (minuteOfDay >= a || minuteOfDay < b) return true;
    }
  }
  return false;
}

export function isOpenAt(hours: OpeningHours, at: Date): boolean {
  const dateKey = formatDateOnly(at);
  if ((hours.closedDates ?? []).includes(dateKey)) {
    return false;
  }
  const weekly = resolveWeekly(hours, at);
  const ranges = weekly[weekdayOf(at)] ?? [];
  if (ranges.length === 0) return false;
  const minute = at.getHours() * 60 + at.getMinutes();
  return isWithinRanges(minute, ranges);
}

export type NextOpenSlot = {
  at: Date;
  open: string;
  close: string;
};

/**
 * Next opening instant at or after `from` (searches up to 14 days).
 * Returns null if no open slot is found.
 */
export function nextOpenSlot(
  hours: OpeningHours,
  from: Date,
  maxDays = 14,
): NextOpenSlot | null {
  const cursor = new Date(from.getTime());
  for (let day = 0; day < maxDays; day++) {
    const dayDate = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + day,
      0,
      0,
      0,
      0,
    );
    const dateKey = formatDateOnly(dayDate);
    if ((hours.closedDates ?? []).includes(dateKey)) continue;

    const weekly = resolveWeekly(hours, dayDate);
    const ranges = weekly[weekdayOf(dayDate)] ?? [];
    for (const [open, close] of ranges) {
      const openMin = parseHmm(open);
      if (openMin == null) continue;
      const openAt = new Date(dayDate.getTime());
      openAt.setHours(Math.floor(openMin / 60), openMin % 60, 0, 0);
      if (openAt >= from) {
        return { at: openAt, open, close };
      }
      // Same day: already open?
      if (day === 0 && isOpenAt(hours, from)) {
        return { at: from, open, close };
      }
    }
  }
  return null;
}
