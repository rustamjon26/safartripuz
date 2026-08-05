/**
 * Idempotent expiry worker. Safe to run every minute via PM2 cron
 * (`safartrip-expire-holds` in ecosystem.config.js).
 * Usage: npx tsx scripts/expire-booking-holds.ts
 *
 * Each step is isolated: a failing taxi sweep must not stop the guide sweep,
 * and neither may stop hotel/homestay hold expiry.
 */
import { bookingService } from "../src/modules/booking";
import { expirePendingTaxiOrders } from "../lib/taxi/expireOrders";
import { expireGuideBookings } from "../lib/guide/expireBookings";

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
  }
}

main().catch((err) => {
  console.error("[expire-booking-holds] fatal", err);
  process.exit(1);
});
