export { healthService, HealthService, WORKERS } from "./service/health.service";
export {
  httpStatusFor,
  worstStatus,
  statusForAge,
  secondsSince,
  CRON_THRESHOLDS,
  OUTBOX_THRESHOLDS,
} from "./domain/health";
export type {
  ComponentHealth,
  ComponentStatus,
  HealthReport,
  StalenessThresholds,
} from "./domain/health";
