/** Locked knowledge-base names — keep in sync with prisma enums / ARCHITECTURE.md */

export type SiteCategory =
  | "OBIDA"
  | "MADRASA"
  | "MASJID"
  | "MAQBARA"
  | "MUZEY"
  | "ARXEOLOGIYA"
  | "TABIAT"
  | "BOZOR"
  | "ZIYORATGOH"
  | "BOSHQA"
  | "RESTORAN"
  | "CHAYXONA"
  | "KAFE";

export type SiteStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

export type ClaimKind = "TARIX" | "ARXITEKTURA" | "AMALIY" | "NARX" | "RIVOYAT";

export type ClaimLevel =
  | "TASDIQLANGAN"
  | "ILMIY_MANBA"
  | "NIZOLI"
  | "OGZAKI_RIVOYAT"
  | "TASDIQLANMAGAN";

export type SourceTier = "A_RASMIY" | "B_ILMIY" | "C_ENSIKLOPEDIK" | "D_IKKILAMCHI";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** [open, close] in HH:mm local wall time. */
export type TimeRange = readonly [string, string];

export type WeeklyHours = Partial<Record<Weekday, TimeRange[]>>;

export type SeasonalHours = {
  /** MM-DD */
  from: string;
  /** MM-DD */
  to: string;
  weekly: WeeklyHours;
};

/**
 * Machine-readable opening hours (`weekly` is what planners read).
 * Optional `raw` keeps the original free-text for DRAFT→PUBLISHED review.
 */
export type OpeningHours = {
  weekly: WeeklyHours;
  /** Original open_hours string from intake (moderation / provenance). */
  raw?: string;
  /** YYYY-MM-DD full-day closures */
  closedDates?: string[];
  seasonal?: SeasonalHours[];
};

export type DeriveClaimLevelSource = {
  tier: SourceTier;
  publisherKey: string;
  positionId?: string | null;
};

export type DeriveClaimLevelInput = {
  sources: DeriveClaimLevelSource[];
  positions: { id: string }[];
  isFolklore: boolean;
};
