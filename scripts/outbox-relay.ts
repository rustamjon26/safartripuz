/**
 * Transactional outbox relay worker.
 * Polls PENDING events, dispatches consumers, retries with backoff.
 *
 * Usage: npx tsx scripts/outbox-relay.ts
 * Env: OUTBOX_POLL_MS (default 2000), OUTBOX_BATCH (20), OUTBOX_MAX_ATTEMPTS (8)
 */
import "../src/shared/boot";
import {
  loadRelayConfig,
  processOutboxBatch,
} from "../src/modules/outbox";

const pollMs = Number(process.env.OUTBOX_POLL_MS ?? 2000);

async function tick() {
  try {
    const result = await processOutboxBatch(loadRelayConfig());
    if (result.claimed > 0) {
      console.log(
        `[outbox-relay] claimed=${result.claimed} sent=${result.sent} retried=${result.retried} failed=${result.failed}`,
      );
    }
  } catch (err) {
    console.error("[outbox-relay] tick failed", err);
  }
}

async function main() {
  console.log(`[outbox-relay] starting poll=${pollMs}ms`);
  await tick();
  setInterval(tick, pollMs);
}

main().catch((err) => {
  console.error("[outbox-relay] fatal", err);
  process.exit(1);
});
