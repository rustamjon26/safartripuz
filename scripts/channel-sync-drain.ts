/**
 * Drains QUEUED channel sync jobs. Safe to run every minute via PM2 cron
 * (`safartrip-channel-sync` in ecosystem.config.js).
 * Usage: npx tsx scripts/channel-sync-drain.ts
 *
 * Stub adapters finish as dry-run and do not push allotment. A live adapter
 * is the only path that sends availability.
 */
import "../src/shared/boot";
import { channelService } from "../src/modules/channel";
import { healthService, WORKERS } from "../src/modules/ops";

async function main() {
  const result = await channelService.drainDue(20);
  console.log(
    `[channel-sync-drain] due=${result.due} ok=${result.ok} failed=${result.failed}`,
  );

  if (result.failed > 0) {
    process.exitCode = 1;
    return;
  }

  await healthService.recordWorkerRun(WORKERS.channelSync);
}

main().catch((err) => {
  console.error("[channel-sync-drain] fatal", err);
  process.exit(1);
});
