/** CJS mirror of booking.state.ts for node --test (keep in sync). */
"use strict";

const TRANSITIONS = {
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

class IllegalTransitionError extends Error {
  constructor(from, to) {
    super(`Illegal booking transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
    this.code = "ILLEGAL_TRANSITION";
    this.from = from;
    this.to = to;
  }
}

function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

function isTerminal(status) {
  return (TRANSITIONS[status] ?? []).length === 0;
}

function isPaidStatus(status) {
  return (
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "CHECKED_IN" ||
    status === "COMPLETED"
  );
}

module.exports = {
  TRANSITIONS,
  IllegalTransitionError,
  canTransition,
  assertTransition,
  isTerminal,
  isPaidStatus,
};
