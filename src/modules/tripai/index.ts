export { normalizeRegion } from "./domain/normalize";
export type { NormalizedRegion } from "./domain/normalize";
export { haversineKm, travelMinutesBetween } from "./domain/distance";
export {
  scheduleDays,
  dataCoverageFromDays,
  evenSlotTargets,
  isOpenOnDay,
  hasAnyOpenDayInRange,
  SLOTS_PER_DAY,
} from "./domain/schedule";
export {
  prominenceRank,
  compareByProminence,
  sortByProminence,
} from "./domain/prominence";
export {
  narrateSchedule,
  buildNarrationSystemPrompt,
  buildNarrationLlmPayload,
} from "./service/narrate";
export {
  narrationIsValid,
  findDisallowedMentions,
  buildTemplateNarration,
} from "./domain/narrationGuard";
export { enrichClaims, isEstablishedLevel } from "./domain/enrich";
export type { RawClaimInput } from "./domain/enrich";
export { LANDMARK_ALIASES } from "./domain/landmarks";
export {
  candidatesRepository,
  CandidatesRepository,
} from "./repository/candidates.repository";
export { plannerService, PlannerService } from "./service/planner.service";
export type { CreatePlanInput } from "./service/planner.service";
export { chatCompletions, loadTripaiLlmConfig } from "./service/llm.client";
export type {
  PlanResult,
  PlanMeta,
  DataCoverage,
  DaySchedule,
  ScheduleSlot,
  ScheduleSlotStatus,
  SurfacedClaim,
  CandidateSite,
  TripLang,
} from "./domain/types";
