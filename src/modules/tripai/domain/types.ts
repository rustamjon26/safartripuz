import type {
  ClaimKind,
  ClaimLevel,
  OpeningHours,
  SiteCategory,
} from "@/src/modules/knowledge";

export type TripLang = "uz" | "ru" | "en";

export type PlanMeta = {
  dataCoverage: "full" | "partial";
  missing: string[];
  narrationSource: "llm" | "template";
};

export type ClaimPositionView = {
  id: string;
  label: string;
  text: string;
  sourceTitles: string[];
};

export type SurfacedClaim = {
  id: string;
  text: string;
  kind: ClaimKind;
  level: ClaimLevel;
  /** Never true for TASDIQLANMAGAN — UI must not treat as established. */
  established: boolean;
  folklore: boolean;
  positions?: ClaimPositionView[];
};

export type CandidateSite = {
  id: string;
  slug: string;
  name: string;
  nameRu: string | null;
  nameEn: string | null;
  regionCode: string;
  category: SiteCategory;
  lat: number | null;
  lng: number | null;
  openingHours: OpeningHours | null;
  /** Default on-site visit length in minutes. */
  visitMinutes: number;
  claims: SurfacedClaim[];
};

export type ScheduleSlot = {
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  siteId: string;
  siteName: string;
  claims: SurfacedClaim[];
};

export type DaySchedule = {
  day: number;
  date: string;
  title: string;
  slots: ScheduleSlot[];
};

export type ScheduleResult = {
  days: DaySchedule[];
  placedSiteIds: string[];
  missing: string[];
};

export type PlanResult = {
  regionCode: string;
  regionDisplay: string;
  lang: TripLang;
  days: DaySchedule[];
  narration: string;
  claims: SurfacedClaim[];
  meta: PlanMeta;
};

export type ScheduleCandidateInput = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  openingHours: OpeningHours | null;
  visitMinutes: number;
};
