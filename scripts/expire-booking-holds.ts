/**
 * Idempotent hold expiry worker. Safe to run every minute via PM2 cron.
 * Usage: npx tsx scripts/expire-booking-holds.ts
 */
import { bookingService } from "../src/modules/booking";

async function main() {
  const result = await bookingService.expireHolds(100);
  console.log(
    `[expire-booking-holds] hotel=${result.hotel} homestay=${result.homestay}`,
  );
}

main().catch((err) => {
  console.error("[expire-booking-holds] fatal", err);
  process.exit(1);
});
