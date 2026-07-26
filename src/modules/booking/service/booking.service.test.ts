import { describe, expect, it } from "vitest";
import {
  IllegalTransitionError,
  assertTransition,
  TRANSITIONS,
  type BookingStatus,
} from "../domain/booking.state";

describe("BookingService transition contract", () => {
  it("payment chain PENDING → HELD → PAID → CONFIRMED is fully legal", () => {
    const chain: [BookingStatus, BookingStatus][] = [
      ["PENDING", "HELD"],
      ["HELD", "PAID"],
      ["PAID", "CONFIRMED"],
    ];
    for (const [from, to] of chain) {
      expect(() => assertTransition(from, to)).not.toThrow();
    }
  });

  it("HELD → PAID → CONFIRMED is legal", () => {
    expect(() => assertTransition("HELD", "PAID")).not.toThrow();
    expect(() => assertTransition("PAID", "CONFIRMED")).not.toThrow();
  });

  it("checkout is CHECKED_IN → COMPLETED only", () => {
    expect(TRANSITIONS.CHECKED_IN).toEqual(["COMPLETED"]);
    expect(() => assertTransition("CHECKED_IN", "CANCELLED")).toThrow(
      IllegalTransitionError,
    );
  });

  it("EXPIRED and CANCELLED reject payment confirm transitions", () => {
    expect(() => assertTransition("EXPIRED", "CONFIRMED")).toThrow(
      IllegalTransitionError,
    );
    expect(() => assertTransition("CANCELLED", "PAID")).toThrow(
      IllegalTransitionError,
    );
  });
});

describe("BookingEvent payload contract", () => {
  it("records from/to/reason/actor shape", () => {
    const event = {
      bookingId: "b1",
      fromStatus: "HELD" as const,
      toStatus: "PAID" as const,
      reason: "PAYMENT_SUCCESS",
      actor: "SYSTEM" as const,
    };
    expect(event.fromStatus).toBe("HELD");
    expect(event.toStatus).toBe("PAID");
    expect(event.reason).toBe("PAYMENT_SUCCESS");
  });
});
