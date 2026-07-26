/** Outbox event type constants + payload shapes. */

export const OutboxEventType = {
  PUSH_DRIVER_NEW_ORDER: "push.driver_new_order",
  PUSH_DRIVER_ORDER_CANCELLED: "push.driver_order_cancelled",
  PUSH_CUSTOMER_ORDER_ACCEPTED: "push.customer_order_accepted",
  PUSH_CUSTOMER_DRIVER_ARRIVED: "push.customer_driver_arrived",
  PUSH_CUSTOMER_ORDER_STARTED: "push.customer_order_started",
  PUSH_CUSTOMER_ORDER_COMPLETED: "push.customer_order_completed",
  DIDOX_INVOICE: "didox.invoice",
  NOTIFICATION_IN_APP: "notification.in_app",
  BOOKING_CONFIRMED: "booking.confirmed",
  PAYMENT_RECEIPT: "payment.receipt",
  PARTNER_NOTIFY: "partner.notify",
} as const;

export type OutboxEventTypeName =
  (typeof OutboxEventType)[keyof typeof OutboxEventType];

export type PushOutboxPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
};

export type DidoxInvoicePayload = {
  paymentId: string;
  dedupeKey: string;
};

export type InAppNotificationPayload = {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  dedupeKey: string;
};

export type BookingConfirmedPayload = {
  bookingId: string;
  bookingKind: "HOTEL" | "HOMESTAY" | "GUIDE";
  userId: string;
  dedupeKey: string;
  title?: string;
  body?: string;
};

export type PaymentReceiptPayload = {
  paymentId: string;
  userId: string;
  amount?: number;
  dedupeKey: string;
};

export type PartnerNotifyPayload = {
  partnerUserId: string;
  bookingId: string;
  bookingKind: string;
  dedupeKey: string;
  title?: string;
  body?: string;
};

export type EnqueueEventInput = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

/**
 * Backoff: min(2^attempts * 5s, 1h) + jitter (0–1s).
 * `attempts` is the post-claim attempt count (1-based after first claim).
 */
export function nextBackoffMs(attempts: number): number {
  const exp = Math.max(0, attempts);
  const base = Math.min(2 ** exp * 5_000, 3_600_000);
  const jitter = Math.floor(Math.random() * 1_000);
  return base + jitter;
}

export function nextAvailableAt(attempts: number, from = new Date()): Date {
  return new Date(from.getTime() + nextBackoffMs(attempts));
}
