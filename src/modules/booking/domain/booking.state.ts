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

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}

/** Statuses that currently hold inventory capacity (post-reserve). */
export function holdsInventory(status: BookingStatus): boolean {
  return (
    status === "HELD" ||
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "CHECKED_IN"
  );
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
