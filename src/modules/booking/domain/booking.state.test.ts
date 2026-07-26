import { describe, expect, it } from "vitest";
import {
  TRANSITIONS,
  assertTransition,
  canTransition,
  IllegalTransitionError,
  isTerminal,
  isPaidStatus,
  type BookingStatus,
} from "./booking.state";

describe("booking.state assertTransition", () => {
  it("allows every edge in TRANSITIONS", () => {
    for (const from of Object.keys(TRANSITIONS) as BookingStatus[]) {
      for (const to of TRANSITIONS[from]) {
        expect(() => assertTransition(from, to)).not.toThrow();
        expect(canTransition(from, to)).toBe(true);
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
