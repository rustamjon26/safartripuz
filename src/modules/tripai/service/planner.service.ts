import {
  categoriesForInterests,
  claimKindsForInterests,
} from "../domain/interests";
import { normalizeRegion } from "../domain/normalize";
import { dataCoverageFromDays, scheduleDays } from "../domain/schedule";
import type { PlanResult, SurfacedClaim, TripLang } from "../domain/types";
import { candidatesRepository } from "../repository/candidates.repository";
import { narrateSchedule } from "./narrate";

export type CreatePlanInput = {
  region: string;
  days?: number;
  startDate?: Date;
  endDate?: Date;
  interests?: string[];
  lang?: TripLang;
  pax?: number;
};

function resolveDayCount(input: CreatePlanInput): {
  startDate: Date;
  dayCount: number;
} {
  if (input.startDate && input.endDate) {
    const start = new Date(
      input.startDate.getFullYear(),
      input.startDate.getMonth(),
      input.startDate.getDate(),
    );
    const end = new Date(
      input.endDate.getFullYear(),
      input.endDate.getMonth(),
      input.endDate.getDate(),
    );
    const ms = end.getTime() - start.getTime();
    const dayCount = Math.max(1, Math.round(ms / 86_400_000) + 1);
    return { startDate: start, dayCount };
  }
  const dayCount = Math.max(1, Math.min(14, Number(input.days ?? 3)));
  const start = input.startDate
    ? new Date(
        input.startDate.getFullYear(),
        input.startDate.getMonth(),
        input.startDate.getDate(),
      )
    : new Date();
  const startDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  return { startDate, dayCount };
}

export class PlannerService {
  async createPlan(input: CreatePlanInput): Promise<PlanResult> {
    const { regionCode, display } = normalizeRegion(input.region);
    const lang: TripLang = input.lang ?? "uz";
    const interests = input.interests ?? [];
    const { startDate, dayCount } = resolveDayCount(input);

    const missing: string[] = [];

    const candidates = await candidatesRepository.findPublishedCandidates({
      regionCode,
      categories: categoriesForInterests(interests),
      claimKinds: claimKindsForInterests(interests),
    });

    if (candidates.length === 0) {
      missing.push(`no_published_sites:${regionCode}`);
    }

    const schedule = scheduleDays({
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        prominence: c.prominence,
        lat: c.lat,
        lng: c.lng,
        openingHours: c.openingHours,
        visitMinutes: c.visitMinutes,
      })),
      startDate,
      dayCount,
      regionCode,
      regionDisplay: display,
    });
    missing.push(...schedule.missing);

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const days = schedule.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => {
        if (slot.status !== "PLACED" || slot.siteId == null) {
          return { ...slot, claims: [] as SurfacedClaim[] };
        }
        const site = byId.get(slot.siteId);
        return {
          ...slot,
          claims: site?.claims ?? [],
        };
      }),
    }));

    const allClaims: SurfacedClaim[] = [];
    const seenClaim = new Set<string>();
    for (const day of days) {
      for (const slot of day.slots) {
        if (slot.status !== "PLACED") continue;
        for (const claim of slot.claims) {
          if (seenClaim.has(claim.id)) continue;
          seenClaim.add(claim.id);
          allClaims.push(claim);
        }
      }
    }

    const narration = await narrateSchedule({
      regionDisplay: display,
      lang,
      days,
      catalogNames: candidates.map((c) => c.name),
    });

    if (narration.source === "template") {
      missing.push("narration_llm_unavailable_or_rejected");
    }

    return {
      regionCode,
      regionDisplay: display,
      lang,
      days,
      narration: narration.text,
      claims: allClaims,
      meta: {
        dataCoverage: dataCoverageFromDays(days),
        missing: [...new Set(missing)],
        narrationSource: narration.source,
      },
    };
  }
}

export const plannerService = new PlannerService();
