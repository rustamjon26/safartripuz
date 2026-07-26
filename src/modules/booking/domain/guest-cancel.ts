/**
 * Shared guest-cancel gate for homestay/guide (no hotel BookingStatus SM).
 * Policy drives refund breakdown; terminal / post-check-in statuses stay blocked.
 */
import {
  computeRefund,
  DEFAULT_FLEXIBLE_RULES,
  type CancellationRuleSnapshot,
  type RefundBreakdown,
} from "./refund";

const TERMINAL_OR_IN_STAY = new Set([
  "CANCELLED",
  "REFUNDED",
  "COMPLETED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "NO_SHOW",
  "EXPIRED",
]);

export function canGuestCancelStatus(status: string): boolean {
  return !TERMINAL_OR_IN_STAY.has(status);
}

export function computeGuestCancelRefund(input: {
  checkInAt: Date;
  bookedAt: Date;
  cancelledAt?: Date;
  grossPaidTiyin: bigint;
  rules?: CancellationRuleSnapshot[];
}): RefundBreakdown {
  return computeRefund({
    checkInAt: input.checkInAt,
    bookedAt: input.bookedAt,
    cancelledAt: input.cancelledAt ?? new Date(),
    grossPaidTiyin: input.grossPaidTiyin,
    policy: { rules: input.rules ?? DEFAULT_FLEXIBLE_RULES },
  });
}
