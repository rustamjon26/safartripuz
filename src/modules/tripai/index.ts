export { normalizeRegion } from "./domain/normalize";
export type { NormalizedRegion } from "./domain/normalize";
export { haversineKm, travelMinutesBetween } from "./domain/distance";
export {
  scheduleDays,
  isOpenOnDay,
  hasAnyOpenDayInRange,
} from "./domain/schedule";
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
export { narrateSchedule, buildNarrationSystemPrompt } from "./service/narrate";
export { chatCompletions, loadTripaiLlmConfig } from "./service/llm.client";
export type {
  PlanResult,
  PlanMeta,
  DaySchedule,
  ScheduleSlot,
  SurfacedClaim,
  CandidateSite,
  TripLang,
} from "./domain/types";
