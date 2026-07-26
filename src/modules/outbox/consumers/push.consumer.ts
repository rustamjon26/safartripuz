import { sendPushToUser } from "@/lib/pushNotification";
import type { OutboxEventRow } from "../repository/outbox.repository";
import { withProcessedKey } from "./idempotency";

export async function consumePush(event: OutboxEventRow): Promise<void> {
  const payload = event.payload as {
    userId?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    dedupeKey?: string;
  };
  const userId = payload.userId;
  const title = payload.title ?? "";
  const body = payload.body ?? "";
  const dedupeKey = payload.dedupeKey ?? `${event.eventType}:${event.id}`;
  if (!userId) return;

  await withProcessedKey("push", dedupeKey, async () => {
    await sendPushToUser(userId, {
      title,
      body,
      data: payload.data ?? { outboxEventId: event.id },
    });
  });
}
