import { describe, expect, it } from "vitest";
import {
  TRANSITIONS,
  assertTransition,
  canTransition,
  IllegalTransitionError,
  isTerminal,
  isPaidStatus,
  requiresPaymentEvidence,
  UnpaidConfirmationError,
  type BookingStatus,
} from "./booking.state";

describe("booking.state assertTransition", () => {
  it("allows every unguarded edge in TRANSITIONS", () => {
    for (const from of Object.keys(TRANSITIONS) as BookingStatus[]) {
      for (const to of TRANSITIONS[from]) {
        if (requiresPaymentEvidence(from, to)) continue;
        expect(() => assertTransition(from, to)).not.toThrow();
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });

  it("opens every guarded edge once payment is confirmed", () => {
    for (const from of Object.keys(TRANSITIONS) as BookingStatus[]) {
      for (const to of TRANSITIONS[from]) {
        if (!requiresPaymentEvidence(from, to)) continue;
        expect(canTransition(from, to, { paymentConfirmed: true })).toBe(true);
        expect(() =>
          assertTransition(from, to, { paymentConfirmed: true }),
        ).not.toThrow();
      }
    }
  });

  it("CHECKED_IN goes to COMPLETED (no CHECKED_OUT)", () => {
    expect(TRANSITIONS.CHECKED_IN).toEqual(["COMPLETED"]);
    expect("CHECKED_OUT" in TRANSITIONS).toBe(false);
  });

  it("rejects a representative set of forbidden transitions", () => {
    const forbidden: [BookingStatus, BookingStatus][] = [
      ["COMPLETED", "CONFIRMED"],
      ["CANCELLED", "HELD"],
      ["EXPIRED", "PAID"],
      ["EXPIRED", "CONFIRMED"],
      ["REFUNDED", "CONFIRMED"],
      ["CHECKED_IN", "PENDING"],
      ["PAID", "HELD"],
    ];
    for (const [from, to] of forbidden) {
      expect(() => assertTransition(from, to)).toThrow(IllegalTransitionError);
    }
  });

  it("terminal states reject all transitions", () => {
    const terminals: BookingStatus[] = [
      "COMPLETED",
      "CANCELLED",
      "REFUNDED",
      "EXPIRED",
    ];
    const all = Object.keys(TRANSITIONS) as BookingStatus[];
    for (const from of terminals) {
      expect(isTerminal(from)).toBe(true);
      for (const to of all) {
        expect(() => assertTransition(from, to)).toThrow(IllegalTransitionError);
      }
    }
  });

  it("isPaidStatus covers post-payment lifecycle", () => {
    expect(isPaidStatus("PAID")).toBe(true);
    expect(isPaidStatus("CONFIRMED")).toBe(true);
    expect(isPaidStatus("HELD")).toBe(false);
  });
});

describe("confirming without payment", () => {
  const guarded: [BookingStatus, BookingStatus][] = [
    ["PENDING", "CONFIRMED"],
    ["HELD", "CONFIRMED"],
  ];

  it("marks exactly the skip-payment edges as guarded", () => {
    for (const [from, to] of guarded) {
      expect(requiresPaymentEvidence(from, to)).toBe(true);
    }
    // The legal chain is not guarded — payment already happened by then.
    expect(requiresPaymentEvidence("PAID", "CONFIRMED")).toBe(false);
    expect(requiresPaymentEvidence("HELD", "PAID")).toBe(false);
    expect(requiresPaymentEvidence("PENDING", "HELD")).toBe(false);
  });

  it("refuses by default — an unproven caller gets nothing", () => {
    for (const [from, to] of guarded) {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertTransition(from, to)).toThrow(UnpaidConfirmationError);
      expect(canTransition(from, to, { paymentConfirmed: false })).toBe(false);
    }
  });

  it("distinguishes an unpaid confirm from a structurally illegal move", () => {
    expect(() => assertTransition("PENDING", "CONFIRMED")).toThrow(
      UnpaidConfirmationError,
    );
    expect(() => assertTransition("EXPIRED", "CONFIRMED")).toThrow(
      IllegalTransitionError,
    );
    // A guarded edge is still refused with the structural error when the pair
    // is not in the table at all.
    expect(canTransition("COMPLETED", "CONFIRMED", { paymentConfirmed: true })).toBe(
      false,
    );
  });
});
