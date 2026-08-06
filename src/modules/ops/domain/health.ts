export type ComponentStatus = "ok" | "degraded" | "unhealthy";

export type ComponentHealth = {
  name: string;
  status: ComponentStatus;
  /** Why it is not "ok". Omitted when healthy. */
  detail?: string;
  /** Extra numbers worth graphing (ages in seconds, backlog counts). */
  metrics?: Record<string, number>;
};

export type HealthReport = {
  status: ComponentStatus;
  timestamp: string;
  version: string;
  components: ComponentHealth[];
};

const RANK: Record<ComponentStatus, number> = {
  ok: 0,
  degraded: 1,
  unhealthy: 2,
};

export function worstStatus(components: ComponentHealth[]): ComponentStatus {
  return components.reduce<ComponentStatus>(
    (worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst),
    "ok",
  );
}

/** 503 only when something is actually broken; degraded still serves traffic. */
export function httpStatusFor(status: ComponentStatus): number {
  return status === "unhealthy" ? 503 : 200;
}

export type StalenessThresholds = {
  degradedAfterMs: number;
  unhealthyAfterMs: number;
};

/**
 * The relay polls every ~2s and backs off up to 8 attempts, so a due event that
 * has sat for a minute means the relay is behind; five means it is not running.
 */
export const OUTBOX_THRESHOLDS: StalenessThresholds = {
  degradedAfterMs: 60_000,
  unhealthyAfterMs: 5 * 60_000,
};

/**
 * The expiry cron fires every minute. Five missed runs is a blip worth seeing;
 * fifteen means holds and taxi orders are piling up unexpired.
 */
export const CRON_THRESHOLDS: StalenessThresholds = {
  degradedAfterMs: 5 * 60_000,
  unhealthyAfterMs: 15 * 60_000,
};

export function statusForAge(
  ageMs: number,
  thresholds: StalenessThresholds,
): ComponentStatus {
  if (ageMs >= thresholds.unhealthyAfterMs) return "unhealthy";
  if (ageMs >= thresholds.degradedAfterMs) return "degraded";
  return "ok";
}

export function secondsSince(from: Date, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
}
