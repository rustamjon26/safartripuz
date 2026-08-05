/**
 * Idempotent expiry worker. Safe to run every minute via PM2 cron
 * (`safartrip-expire-holds` in ecosystem.config.js).
 * Usage: npx tsx scripts/expire-booking-holds.ts
 *
 * Each step is isolated: a failing taxi sweep must not stop the guide sweep,
 * and neither may stop hotel/homestay hold expiry.
 */
import "../src/shared/boot";
import { bookingService } from "../src/modules/booking";
import { expirePendingTaxiOrders } from "../lib/taxi/expireOrders";
import { expireGuideBookings } from "../lib/guide/expireBookings";
import { healthService, WORKERS } from "../src/modules/ops";

async function step<T>(name: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    console.error(`[expire-booking-holds] ${name} failed`, err);
    return null;
  }
}

async function main() {
  const holds = await step("holds", () => bookingService.expireHolds(100));
  const taxi = await step("taxi", () => expirePendingTaxiOrders(100));
  const guide = await step("guide", () => expireGuideBookings(100));

  console.log(
    `[expire-booking-holds] hotel=${holds?.hotel ?? "err"} homestay=${holds?.homestay ?? "err"} ` +
      `taxi=${taxi ?? "err"} guideCancelled=${guide?.cancelled ?? "err"} guideAdvanced=${guide?.advanced ?? "err"}`,
  );

  if (holds === null || taxi === null || guide === null) {
    process.exitCode = 1;
    return;
  }

  // Heartbeat only on a clean sweep — /api/health treats a stale one as a
  // stalled cron, which is exactly what a partly failing run is.
  await step("heartbeat", () =>
    healthService.recordWorkerRun(WORKERS.expiryCron),
  );
}

main().catch((err) => {
  console.error("[expire-booking-holds] fatal", err);
  process.exit(1);
});
