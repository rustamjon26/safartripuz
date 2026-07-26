import { outboxRepository } from "../repository/outbox.repository";

/**
 * Prefer: side effect then mark processed key (at-least-once; rare double-push accepted).
 * If key already exists before send → skip (idempotent consumer).
 */
export async function withProcessedKey(
  consumer: string,
  key: string,
  sideEffect: () => Promise<void>,
): Promise<"sent" | "skipped"> {
  if (await outboxRepository.hasProcessed(consumer, key)) {
    return "skipped";
  }
  await sideEffect();
  await outboxRepository.tryMarkProcessed(consumer, key);
  return "sent";
}
