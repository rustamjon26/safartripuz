import { nextAvailableAt, OutboxEventType } from "../domain/types";
import { consumeDidoxInvoice } from "../consumers/didox.consumer";
import {
  consumeComposedNotify,
  consumeInAppNotification,
} from "../consumers/notification.consumer";
import { consumePush } from "../consumers/push.consumer";
import {
  outboxRepository,
  type OutboxEventRow,
} from "../repository/outbox.repository";

export type RelayConfig = {
  batchSize: number;
  maxAttempts: number;
};

export function loadRelayConfig(): RelayConfig {
  return {
    batchSize: Number(process.env.OUTBOX_BATCH ?? 20),
    maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 8),
  };
}

type ConsumerFn = (event: OutboxEventRow) => Promise<void>;

const consumers: Record<string, ConsumerFn> = {
  [OutboxEventType.PUSH_DRIVER_NEW_ORDER]: consumePush,
  [OutboxEventType.PUSH_DRIVER_ORDER_CANCELLED]: consumePush,
  [OutboxEventType.PUSH_CUSTOMER_ORDER_ACCEPTED]: consumePush,
  [OutboxEventType.PUSH_CUSTOMER_DRIVER_ARRIVED]: consumePush,
  [OutboxEventType.PUSH_CUSTOMER_ORDER_STARTED]: consumePush,
  [OutboxEventType.PUSH_CUSTOMER_ORDER_COMPLETED]: consumePush,
  [OutboxEventType.DIDOX_INVOICE]: consumeDidoxInvoice,
  [OutboxEventType.NOTIFICATION_IN_APP]: consumeInAppNotification,
  [OutboxEventType.BOOKING_CONFIRMED]: consumeComposedNotify,
  [OutboxEventType.PAYMENT_RECEIPT]: consumeComposedNotify,
  [OutboxEventType.PARTNER_NOTIFY]: consumeComposedNotify,
};

function alertFailed(event: OutboxEventRow, error: string): void {
  console.error("ALERT outbox_event_failed", {
    id: event.id,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    attempts: event.attempts,
    error,
  });
}

export async function dispatchEvent(event: OutboxEventRow): Promise<void> {
  const consumer = consumers[event.eventType];
  if (!consumer) {
    throw new Error(`Unknown outbox eventType: ${event.eventType}`);
  }
  await consumer(event);
}

/**
 * Claim → dispatch → markSent / markRetry / markFailed.
 * Returns counts for logging / cron response.
 */
export async function processOutboxBatch(
  config: RelayConfig = loadRelayConfig(),
): Promise<{ claimed: number; sent: number; retried: number; failed: number }> {
  const claimed = await outboxRepository.claimBatch(config.batchSize);
  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const event of claimed) {
    try {
      if (!consumers[event.eventType]) {
        await outboxRepository.markFailed(
          event.id,
          `Unknown eventType: ${event.eventType}`,
        );
        alertFailed(event, `Unknown eventType: ${event.eventType}`);
        failed += 1;
        continue;
      }

      await dispatchEvent(event);
      await outboxRepository.markSent(event.id);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (event.attempts >= config.maxAttempts) {
        await outboxRepository.markFailed(event.id, message);
        alertFailed(event, message);
        failed += 1;
      } else {
        await outboxRepository.markRetry(
          event.id,
          message,
          nextAvailableAt(event.attempts),
        );
        retried += 1;
      }
    }
  }

  return { claimed: claimed.length, sent, retried, failed };
}
