import {
  formatDateOnly,
  isOpenAt,
  parseHmm,
  type OpeningHours,
} from "@/src/modules/knowledge";
import { haversine, travelMinutesBetween } from "./distance";
import { compareByProminence } from "./prominence";
import type {
  DataCoverage,
  DaySchedule,
  ScheduleCandidateInput,
  ScheduleResult,
  ScheduleSlot,
} from "./types";

/** Target stops per calendar day. Unfilled slots become NO_DATA. */
export const SLOTS_PER_DAY = 3;

/**
 * Max haversine km between consecutive PLACED stops on the same day
 * (slots 2+). Longer legs are refused → NO_DATA pad for remaining day slots.
 * Far sites can still open a day as slot 1 via prominence.
 *
 * Tuned for Samarqand old-city cluster (~Imom is outside). Tashkent’s
 * published spread is wider (~25 km across); Buxoro/Xiva will need their own
 * budget — prefer a per-`regionCode` map before those regions go live.
 */
export const MAX_INTRA_DAY_LEG_KM = 12;

const DEFAULT_VISIT_MINUTES = 90;
const DEFAULT_GAP_MINUTES = 10;

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

function nominalNoDataWindow(
  dayDate: Date,
  slotIndex: number,
  after: Date | null,
): { start: Date; end: Date } {
  const { open } = dayWindow(dayDate);
  const start = after
    ? addMinutes(after, DEFAULT_GAP_MINUTES)
    : addMinutes(
        open,
        slotIndex * (DEFAULT_VISIT_MINUTES + DEFAULT_GAP_MINUTES),
      );
  const end = addMinutes(start, DEFAULT_VISIT_MINUTES);
  return { start, end };
}

export type ScheduleDaysInput = {
  candidates: ScheduleCandidateInput[];
  /** Inclusive trip start (local calendar). */
  startDate: Date;
  dayCount: number;
  regionDisplay: string;
};

export function dataCoverageFromDays(days: DaySchedule[]): DataCoverage {
  const slots = days.flatMap((d) => d.slots);
  const filled = slots.filter((s) => s.status === "PLACED").length;
  if (filled === 0) return "none";
  if (filled === slots.length) return "full";
  return "partial";
}

/**
 * Even PLACED targets across days (cap SLOTS_PER_DAY). Remainder goes to
 * earlier days: e.g. 6 sites / 3 days → [2,2,2]; 7 / 3 → [3,2,2].
 */
export function evenSlotTargets(
  siteCount: number,
  dayCount: number,
  maxPerDay: number = SLOTS_PER_DAY,
): number[] {
  if (dayCount <= 0) return [];
  const capped = Math.min(
    Math.max(0, siteCount),
    dayCount * maxPerDay,
  );
  const base = Math.floor(capped / dayCount);
  let rem = capped % dayCount;
  const targets = Array.from({ length: dayCount }, () => base);
  for (let i = 0; i < dayCount && rem > 0; i++) {
    if (targets[i]! < maxPerDay) {
      targets[i]! += 1;
      rem -= 1;
    }
  }
  return targets;
}

function distanceKm(
  a: ScheduleCandidateInput,
  b: ScheduleCandidateInput,
): number {
  if (
    a.lat == null ||
    a.lng == null ||
    b.lat == null ||
    b.lng == null ||
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return haversine(a.lat, a.lng, b.lat, b.lng);
}

/**
 * Order remaining candidates for the next slot.
 *
 * Slot 1 (no `last`): prominence first, then name — same as catalog sort.
 *
 * Slots 2+: distance is a **filter** ({@link MAX_INTRA_DAY_LEG_KM} from
 * `last`), prominence is the **choice** among survivors (then nearer, then
 * name). Keeps Imom from sandwiching the old city without letting dense
 * OPTIONAL neighbours (museum ~100 m from Registon) crowd out PRIMARY.
 */
export function orderCandidatesForSlot(
  remaining: ScheduleCandidateInput[],
  last: ScheduleCandidateInput | null,
): ScheduleCandidateInput[] {
  if (!last) {
    return [...remaining].sort(compareByProminence);
  }
  return [...remaining]
    .filter((c) => distanceKm(last, c) <= MAX_INTRA_DAY_LEG_KM)
    .sort((a, b) => {
      const byProminence = compareByProminence(a, b);
      if (byProminence !== 0) return byProminence;
      return distanceKm(last, a) - distanceKm(last, b);
    });
}

type PlaceAttempt = {
  candidate: ScheduleCandidateInput;
  startAt: Date;
  end: Date;
};

function tryScheduleCandidate(
  candidate: ScheduleCandidateInput,
  dayDate: Date,
  dayOpen: Date,
  dayClose: Date,
  cursor: Date,
  last: ScheduleCandidateInput | null,
): PlaceAttempt | null {
  const travel = last ? travelMinutesBetween(last, candidate) : 0;
  const arrive = addMinutes(cursor, travel);

  if (
    arrive.getTime() + candidate.visitMinutes * 60_000 >
    dayClose.getTime()
  ) {
    return null;
  }

  let startAt = arrive;
  if (candidate.openingHours && !isOpenAt(candidate.openingHours, arrive)) {
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
    if (!found) return null;
    startAt = found;
  }

  if (candidate.openingHours && !isOpenAt(candidate.openingHours, startAt)) {
    return null;
  }

  return {
    candidate,
    startAt,
    end: addMinutes(startAt, candidate.visitMinutes),
  };
}

/**
 * Pure scheduler. Never places a site on a day when it is closed.
 * Each site is used at most once per plan. Sites are spread evenly across
 * days; remaining capacity → NO_DATA (days keep SLOTS_PER_DAY slots).
 *
 * Within a day: slot 1 by prominence; later slots by nearest to the last
 * placed site (see {@link orderCandidatesForSlot}).
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

  const targets = evenSlotTargets(usable.length, dayDates.length);
  const placed = new Set<string>();
  const days: DaySchedule[] = [];

  for (let i = 0; i < dayDates.length; i++) {
    const dayDate = dayDates[i]!;
    const dateStr = formatDateOnly(dayDate);
    const slots: ScheduleSlot[] = [];
    const { open: dayOpen, close: dayClose } = dayWindow(dayDate);
    let cursor = new Date(dayOpen);
    let last: ScheduleCandidateInput | null = null;
    const dayTarget = targets[i] ?? 0;
    let placedToday = 0;

    while (placedToday < dayTarget) {
      const remaining = usable.filter(
        (c) => !placed.has(c.id) && isOpenOnDay(c.openingHours, dayDate),
      );
      if (remaining.length === 0) break;

      const ordered = orderCandidatesForSlot(remaining, last);
      if (ordered.length === 0) {
        // No candidate within MAX_INTRA_DAY_LEG_KM of last — stop this day.
        break;
      }

      let attempt: PlaceAttempt | null = null;
      for (const candidate of ordered) {
        attempt = tryScheduleCandidate(
          candidate,
          dayDate,
          dayOpen,
          dayClose,
          cursor,
          last,
        );
        if (attempt) break;
      }
      if (!attempt) break;

      const { candidate, startAt, end } = attempt;
      const startMin = startAt.getHours() * 60 + startAt.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();

      slots.push({
        day: i + 1,
        date: dateStr,
        startTime: minutesToHmm(startMin),
        endTime: minutesToHmm(endMin),
        status: "PLACED",
        siteId: candidate.id,
        siteName: candidate.name,
        claims: [],
      });
      placed.add(candidate.id);
      last = candidate;
      cursor = end;
      placedToday += 1;
    }

    while (slots.length < SLOTS_PER_DAY) {
      const after =
        slots.length > 0
          ? (() => {
              const prev = slots[slots.length - 1]!;
              const mins = parseHmm(prev.endTime);
              if (mins == null) return cursor;
              const d = new Date(dayDate);
              d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
              return d;
            })()
          : null;
      const { start, end } = nominalNoDataWindow(dayDate, slots.length, after);
      slots.push({
        day: i + 1,
        date: dateStr,
        startTime: minutesToHmm(start.getHours() * 60 + start.getMinutes()),
        endTime: minutesToHmm(end.getHours() * 60 + end.getMinutes()),
        status: "NO_DATA",
        siteId: null,
        siteName: null,
        claims: [],
      });
    }

    days.push({
      day: i + 1,
      date: dateStr,
      title: `${input.regionDisplay} — ${i + 1}-kun`,
      slots,
    });
  }

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
