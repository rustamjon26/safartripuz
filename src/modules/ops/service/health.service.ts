import { collectBootEnvIssues } from "@/src/shared/env";
import {
  type ComponentHealth,
  CRON_THRESHOLDS,
  type HealthReport,
  OUTBOX_THRESHOLDS,
  secondsSince,
  statusForAge,
  worstStatus,
} from "../domain/health";
import { opsRepository } from "../repository/ops.repository";

/** Worker names used as SystemSetting heartbeat keys. */
export const WORKERS = {
  outboxRelay: "outbox-relay",
  expiryCron: "expire-booking-holds",
} as const;

async function checkDatabase(): Promise<ComponentHealth> {
  try {
    await opsRepository.pingDatabase();
    return { name: "database", status: "ok" };
  } catch (err) {
    return {
      name: "database",
      status: "unhealthy",
      detail: err instanceof Error ? err.message : "query failed",
    };
  }
}

async function checkOutbox(now: Date): Promise<ComponentHealth> {
  const [oldest, pending, failed] = await Promise.all([
    opsRepository.oldestDueOutboxEvent(now),
    opsRepository.countOutbox("PENDING"),
    opsRepository.countOutbox("FAILED"),
  ]);

  const metrics: Record<string, number> = { pending, failed };
  if (!oldest) {
    return {
      name: "outbox",
      status: failed > 0 ? "degraded" : "ok",
      detail: failed > 0 ? `${failed} event(s) exhausted their retries` : undefined,
      metrics,
    };
  }

  const ageMs = now.getTime() - oldest.createdAt.getTime();
  metrics.oldestDueAgeSeconds = secondsSince(oldest.createdAt, now);
  const status = statusForAge(ageMs, OUTBOX_THRESHOLDS);

  return {
    name: "outbox",
    status: status === "ok" && failed > 0 ? "degraded" : status,
    detail:
      status === "ok"
        ? failed > 0
          ? `${failed} event(s) exhausted their retries`
          : undefined
        : `oldest due event unprocessed for ${metrics.oldestDueAgeSeconds}s (${oldest.attempts} attempt(s))`,
    metrics,
  };
}

async function checkWorkerHeartbeat(
  name: string,
  worker: string,
  now: Date,
): Promise<ComponentHealth> {
  const last = await opsRepository.readHeartbeat(worker);
  if (!last) {
    // A freshly deployed host has not run the cron yet; that is not a failure.
    return {
      name,
      status: "degraded",
      detail: "no run recorded yet",
    };
  }

  const ageSeconds = secondsSince(last, now);
  const status = statusForAge(now.getTime() - last.getTime(), CRON_THRESHOLDS);
  return {
    name,
    status,
    detail: status === "ok" ? undefined : `last run ${ageSeconds}s ago`,
    metrics: { lastRunAgeSeconds: ageSeconds },
  };
}

function checkEnv(): ComponentHealth {
  const { fatal, warnings } = collectBootEnvIssues();
  if (fatal.length > 0) {
    return {
      name: "env",
      status: "unhealthy",
      detail: fatal.map((i) => `${i.variable}: ${i.problem}`).join("; "),
    };
  }
  if (warnings.length > 0) {
    return {
      name: "env",
      status: "degraded",
      detail: `${warnings.length} integration(s) unconfigured: ${warnings
        .map((i) => i.variable)
        .join(", ")}`,
    };
  }
  return { name: "env", status: "ok" };
}

export class HealthService {
  /**
   * "The DB answers SELECT 1" was never the same as "the platform works":
   * a dead outbox relay or expiry cron leaves the site up while notifications
   * and holds quietly stop moving.
   */
  async check(now: Date = new Date()): Promise<HealthReport> {
    const database = await checkDatabase();

    const components: ComponentHealth[] = [database, checkEnv()];

    if (database.status === "ok") {
      components.push(
        await checkOutbox(now),
        await checkWorkerHeartbeat("outbox-relay", WORKERS.outboxRelay, now),
        await checkWorkerHeartbeat("expiry-cron", WORKERS.expiryCron, now),
      );
    }

    return {
      status: worstStatus(components),
      timestamp: now.toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      components,
    };
  }

  async recordWorkerRun(worker: string, at: Date = new Date()): Promise<void> {
    await opsRepository.recordHeartbeat(worker, at);
  }
}

export const healthService = new HealthService();
