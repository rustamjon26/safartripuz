import { describe, expect, it } from "vitest";
import {
  RETIRED_PAYME_TEST_BOOKING_IDS,
  isRetiredPaymeTestBookingId,
  retiredTestCleanupBlocker,
} from "./retired-test-bookings";

describe("retired Payme test booking ids", () => {
  it("allowlists only the three named sandbox ids", () => {
    expect([...RETIRED_PAYME_TEST_BOOKING_IDS]).toEqual([
      "payme-test-s1",
      "payme-test-s2",
      "payme-test-001",
    ]);
    expect(isRetiredPaymeTestBookingId("payme-test-s1")).toBe(true);
    expect(isRetiredPaymeTestBookingId("payme-test-002")).toBe(false);
    expect(isRetiredPaymeTestBookingId("clxyzrealcuid")).toBe(false);
  });

  it("refuses cleanup when a booking row still exists", () => {
    expect(
      retiredTestCleanupBlocker({
        bookingId: "payme-test-001",
        legacyBookingExists: true,
        hotelBookingExists: false,
        homestayBookingExists: false,
        guideBookingExists: false,
        partnerEarningStatuses: ["PENDING"],
      }),
    ).toBe("booking_still_exists");
  });

  it("refuses cleanup when PartnerEarning was paid out", () => {
    expect(
      retiredTestCleanupBlocker({
        bookingId: "payme-test-s1",
        legacyBookingExists: false,
        hotelBookingExists: false,
        homestayBookingExists: false,
        guideBookingExists: false,
        partnerEarningStatuses: ["PAID"],
      }),
    ).toBe("partner_earning_paid_out");
  });

  it("allows orphan test rows that were never paid out", () => {
    expect(
      retiredTestCleanupBlocker({
        bookingId: "payme-test-s2",
        legacyBookingExists: false,
        hotelBookingExists: false,
        homestayBookingExists: false,
        guideBookingExists: false,
        partnerEarningStatuses: ["PENDING"],
      }),
    ).toBeNull();
  });
});
