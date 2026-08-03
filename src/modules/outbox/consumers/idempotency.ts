import { outboxRepository } from "../repository/outbox.repository";

/**
 * Atomic claim-first idempotency:
 * 1) INSERT processed key (unique) — loser of a concurrent race skips.
 * 2) Run the side effect.
 * 3) On failure, release the claim and rethrow so the outbox retry re-runs.
 *
 * Duplicate side effects now require a process crash inside step 2→3, instead
 * of the old check-then-act window that raced on every concurrent delivery.
 */
export async function withProcessedKey(
  consumer: string,
  key: string,
  sideEffect: () => Promise<void>,
): Promise<"sent" | "skipped"> {
  const claimed = await outboxRepository.tryMarkProcessed(consumer, key);
  if (!claimed) {
    return "skipped";
  }
  try {
    await sideEffect();
    return "sent";
  } catch (err) {
    try {
      await outboxRepository.releaseProcessedKey(consumer, key);
    } catch (releaseErr) {
      console.error(
        "[outbox] failed to release processed key after side-effect error",
        { consumer, key, releaseErr },
      );
    }
    throw err;
  }
}
