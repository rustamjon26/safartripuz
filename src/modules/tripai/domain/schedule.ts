import {
  formatDateOnly,
  isOpenAt,
  parseHmm,
  type OpeningHours,
} from "@/src/modules/knowledge";
import { travelMinutesBetween } from "./distance";
import type { DaySchedule, ScheduleCandidateInput, ScheduleResult, ScheduleSlot } from "./types";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function minutesToHmm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function dayWindow(dayDate: Date): { open: Date; close: Date } {
  const open = new Date(dayDate);
  open.setHours(9, 0, 0, 0);
  const close = new Date(dayDate);
  close.setHours(18, 0, 0, 0);
  return { open, close };
}

/** True if the site has at least one open minute on this calendar day within 09:00–18:00. */
export function isOpenOnDay(
  hours: OpeningHours | null,
  dayDate: Date,
): boolean {
  if (!hours) {
    // Unknown hours: treat as open (cannot schedule against a string).
    return true;
  }
  const { open, close } = dayWindow(dayDate);
  for (let t = open.getTime(); t < close.getTime(); t += 30 * 60_000) {
    if (isOpenAt(hours, new Date(t))) return true;
  }
  return false;
}

export function hasAnyOpenDayInRange(
  hours: OpeningHours | null,
  dayDates: Date[],
): boolean {
  return dayDates.some((d) => isOpenOnDay(hours, d));
}

function buildDayDates(start: Date, dayCount: number): Date[] {
  const out: Date[] = [];
  const base = startOfDay(start);
  for (let i = 0; i < dayCount; i++) {
    out.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
  }
  return out;
}

export type ScheduleDaysInput = {
  candidates: ScheduleCandidateInput[];
  /** Inclusive trip start (local calendar). */
  startDate: Date;
  dayCount: number;
  regionDisplay: string;
};

/**
 * Pure scheduler. Never places a site on a day when it is closed.
 * Sites with zero open days in range are excluded and listed in `missing`.
 */
export function scheduleDays(input: ScheduleDaysInput): ScheduleResult {
  const dayDates = buildDayDates(input.startDate, input.dayCount);
  const missing: string[] = [];
  const usable: ScheduleCandidateInput[] = [];

  for (const c of input.candidates) {
    if (!hasAnyOpenDayInRange(c.openingHours, dayDates)) {
      missing.push(`no_open_slot:${c.id}:${c.name}`);
      continue;
    }
    usable.push(c);
  }

  const placed = new Set<string>();
  const days: DaySchedule[] = [];
  let cursorIdx = 0;

  for (let i = 0; i < dayDates.length; i++) {
    const dayDate = dayDates[i]!;
    const dateStr = formatDateOnly(dayDate);
    const slots: ScheduleSlot[] = [];
    const { open: dayOpen, close: dayClose } = dayWindow(dayDate);
    let cursor = new Date(dayOpen);
    let last: ScheduleCandidateInput | null = null;
    let slotsToday = 0;
    const maxSlots = 3;
    const attempts = usable.length * 2;
    let tried = 0;

    while (slotsToday < maxSlots && tried < attempts && usable.length > 0) {
      tried += 1;
      if (cursorIdx >= usable.length) cursorIdx = 0;
      const candidate = usable[cursorIdx]!;
      cursorIdx += 1;

      if (placed.has(candidate.id) && usable.length > placed.size) {
        continue;
      }

      // Core invariant: never place on a closed day.
      if (!isOpenOnDay(candidate.openingHours, dayDate)) {
        continue;
      }

      const travel = last
        ? travelMinutesBetween(last, candidate)
        : 0;
      const arrive = addMinutes(cursor, travel);

      if (arrive.getTime() + candidate.visitMinutes * 60_000 > dayClose.getTime()) {
        continue;
      }

      // Must be open at arrival (when hours known).
      if (
        candidate.openingHours &&
        !isOpenAt(candidate.openingHours, arrive)
      ) {
        // Try next half-hour within the day while still open.
        let found: Date | null = null;
        for (
          let t = Math.max(arrive.getTime(), dayOpen.getTime());
          t + candidate.visitMinutes * 60_000 <= dayClose.getTime();
          t += 30 * 60_000
        ) {
          const probe = new Date(t);
          if (isOpenAt(candidate.openingHours, probe)) {
            found = probe;
            break;
          }
        }
        if (!found) continue;
        cursor = found;
      } else {
        cursor = arrive;
      }

      const end = addMinutes(cursor, candidate.visitMinutes);
      const startMin =
        cursor.getHours() * 60 + cursor.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();

      // Guard: openingHours must allow the whole visit start.
      if (
        candidate.openingHours &&
        !isOpenAt(candidate.openingHours, cursor)
      ) {
        continue;
      }

      slots.push({
        day: i + 1,
        date: dateStr,
        startTime: minutesToHmm(startMin),
        endTime: minutesToHmm(endMin),
        siteId: candidate.id,
        siteName: candidate.name,
        claims: [],
      });
      placed.add(candidate.id);
      last = candidate;
      cursor = end;
      slotsToday += 1;
    }

    days.push({
      day: i + 1,
      date: dateStr,
      title: `${input.regionDisplay} — ${i + 1}-kun`,
      slots,
    });
  }

  // Candidates that were usable but never placed (capacity) are not "missing"
  // in the open-slot sense; only zero-open-slot sites go to missing.
  return {
    days,
    placedSiteIds: [...placed],
    missing,
  };
}

/** Exported for tests: parseHmm re-export sanity. */
export function slotFitsOpenHours(
  hours: OpeningHours | null,
  dayDate: Date,
  startHmm: string,
): boolean {
  if (!hours) return true;
  if (!isOpenOnDay(hours, dayDate)) return false;
  const mins = parseHmm(startHmm);
  if (mins == null) return false;
  const at = new Date(dayDate);
  at.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return isOpenAt(hours, at);
}
