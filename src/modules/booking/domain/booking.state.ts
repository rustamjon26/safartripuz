/** Local status union — keep in sync with Prisma BookingStatus enum. */
export type BookingStatus =
  | "PENDING"
  | "HELD"
  | "PAID"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "NO_SHOW"
  | "EXPIRED";

/**
 * Allowed HotelBooking status transitions.
 * CHECKED_OUT removed: checkout is CHECKED_IN → COMPLETED.
 *
 * PENDING/HELD → CONFIRMED are listed but payment-guarded; see
 * {@link requiresPaymentEvidence}. The unguarded chain is
 * PENDING → HELD → PAID → CONFIRMED.
 */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["HELD", "CONFIRMED", "CANCELLED", "EXPIRED"],
  HELD: ["PAID", "CONFIRMED", "CANCELLED", "EXPIRED"],
  PAID: ["CONFIRMED", "REFUNDED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW", "REFUNDED"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  NO_SHOW: ["REFUNDED"],
  EXPIRED: [],
};

/**
 * Edges that reach CONFIRMED while skipping PAID. They exist for the front desk
 * taking money outside the payment flow, so they only open once the payment is
 * actually on record — never on a caller's say-so.
 */
const PAYMENT_GUARDED_EDGES: ReadonlySet<string> = new Set([
  "PENDING>CONFIRMED",
  "HELD>CONFIRMED",
]);

export function requiresPaymentEvidence(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return PAYMENT_GUARDED_EDGES.has(`${from}>${to}`);
}

export class IllegalTransitionError extends Error {
  readonly code = "ILLEGAL_TRANSITION" as const;

  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Illegal booking transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
  }
}

/** A guarded edge was attempted with no payment on record. */
export class UnpaidConfirmationError extends Error {
  readonly code = "UNPAID_CONFIRMATION" as const;

  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(
      `Cannot confirm an unpaid booking: ${from} → ${to} requires a recorded payment`,
    );
    this.name = "UnpaidConfirmationError";
  }
}

/**
 * `paymentConfirmed` defaults to false, so the guarded edges are closed unless
 * a caller proves otherwise. `BookingService.transition` derives that proof from
 * the database — it is not a flag the caller can simply assert.
 */
export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
  opts: { paymentConfirmed?: boolean } = {},
): boolean {
  if (!(TRANSITIONS[from] ?? []).includes(to)) return false;
  if (requiresPaymentEvidence(from, to)) {
    return opts.paymentConfirmed === true;
  }
  return true;
}

export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
  opts: { paymentConfirmed?: boolean } = {},
): void {
  if (!(TRANSITIONS[from] ?? []).includes(to)) {
    throw new IllegalTransitionError(from, to);
  }
  if (requiresPaymentEvidence(from, to) && opts.paymentConfirmed !== true) {
    throw new UnpaidConfirmationError(from, to);
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}

/**
 * Statuses that currently hold reserved capacity in the Inventory table.
 *
 * Narrower than {@link occupiesRoomNights} on purpose: PENDING never reserved
 * anything (inventory is taken when the booking becomes HELD), so releasing on
 * its behalf would hand back capacity that was never consumed.
 */
export function holdsInventory(status: BookingStatus): boolean {
  return (
    status === "HELD" ||
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "CHECKED_IN"
  );
}

/**
 * Statuses whose room-nights are back on sale. Everything else still occupies
 * the room for its dates.
 */
export const ROOM_RELEASED_STATUSES = [
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
  "REFUNDED",
] as const;

/**
 * Does this booking still take a room off the market for its dates?
 *
 * One definition for every occupancy question, matching how the Inventory table
 * is built (see scripts/backfill-inventory.ts). Counting by exclusion is what
 * keeps HELD and PAID in — a room someone is mid-checkout on is not free, and
 * an availability view that omits them will oversell it.
 */
export function occupiesRoomNights(status: BookingStatus | string): boolean {
  return !(ROOM_RELEASED_STATUSES as readonly string[]).includes(status);
}

/** Derive paidness from lifecycle status (not a boolean column). */
export function isPaidStatus(status: BookingStatus): boolean {
  return (
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "CHECKED_IN" ||
    status === "COMPLETED"
  );
}
