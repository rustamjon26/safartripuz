import { sendPushToUser } from "@/lib/pushNotification";
import {
  outboxRepository,
  type OutboxEventRow,
} from "../repository/outbox.repository";
import { withProcessedKey } from "./idempotency";

async function createInApp(input: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
}): Promise<void> {
  await outboxRepository.createInAppNotification(input);
}

/** In-app Notification row only. */
export async function consumeInAppNotification(event: OutboxEventRow): Promise<void> {
  const p = event.payload as {
    userId?: string;
    title?: string;
    body?: string;
    type?: string;
    dedupeKey?: string;
  };
  if (!p.userId || !p.title) return;
  const dedupeKey =
    p.dedupeKey ?? `notification:${p.userId}:${p.type ?? "info"}:${event.aggregateId}`;

  await withProcessedKey("notification", dedupeKey, async () => {
    await createInApp({
      userId: p.userId!,
      title: p.title!,
      body: p.body,
      type: p.type,
    });
  });
}

/**
 * Compose: in-app Notification + Expo push; stub email/SMS log until providers exist.
 */
export async function consumeComposedNotify(event: OutboxEventRow): Promise<void> {
  const p = event.payload as {
    userId?: string;
    partnerUserId?: string;
    title?: string;
    body?: string;
    type?: string;
    dedupeKey?: string;
    data?: Record<string, unknown>;
  };
  const userId = p.userId ?? p.partnerUserId;
  if (!userId) return;

  const title =
    p.title ??
    (event.eventType === "payment.receipt"
      ? "To'lov qabul qilindi"
      : event.eventType === "booking.confirmed"
        ? "Bron tasdiqlandi"
        : event.eventType === "partner.notify"
          ? "Yangi bron"
          : "Xabar");
  const body = p.body ?? "";
  const dedupeKey = p.dedupeKey ?? `${event.eventType}:${event.aggregateId}:${userId}`;

  await withProcessedKey("compose", dedupeKey, async () => {
    await createInApp({
      userId,
      title,
      body,
      type: p.type ?? event.eventType,
    });
    await sendPushToUser(userId, {
      title,
      body,
      data: p.data ?? { type: event.eventType, aggregateId: event.aggregateId },
    });
    // Stub email/SMS until providers exist
    console.info("[outbox] email/sms stub", {
      eventType: event.eventType,
      userId,
      dedupeKey,
    });
  });
}
