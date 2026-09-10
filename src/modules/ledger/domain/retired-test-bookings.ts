/**
 * Retired legacy Payme sandbox booking ids. The Booking rows were deleted
 * after merchant tests; PartnerEarning / LedgerTransaction can remain as
 * orphans. Exact allowlist only — never a prefix match on real cuids.
 */
export const RETIRED_PAYME_TEST_BOOKING_IDS = [
  "payme-test-s1",
  "payme-test-s2",
  "payme-test-001",
] as const;

export type RetiredPaymeTestBookingId =
  (typeof RETIRED_PAYME_TEST_BOOKING_IDS)[number];

export function isRetiredPaymeTestBookingId(
  bookingId: string,
): bookingId is RetiredPaymeTestBookingId {
  return (RETIRED_PAYME_TEST_BOOKING_IDS as readonly string[]).includes(
    bookingId,
  );
}

export type RetiredTestCleanupBlocker =
  | "not_allowlisted"
  | "booking_still_exists"
  | "partner_earning_paid_out";

export type RetiredTestCleanupSafety = {
  bookingId: string;
  legacyBookingExists: boolean;
  hotelBookingExists: boolean;
  homestayBookingExists: boolean;
  guideBookingExists: boolean;
  partnerEarningStatuses: string[];
};

export function retiredTestCleanupBlocker(
  input: RetiredTestCleanupSafety,
): RetiredTestCleanupBlocker | null {
  if (!isRetiredPaymeTestBookingId(input.bookingId)) {
    return "not_allowlisted";
  }
  if (
    input.legacyBookingExists ||
    input.hotelBookingExists ||
    input.homestayBookingExists ||
    input.guideBookingExists
  ) {
    return "booking_still_exists";
  }
  if (input.partnerEarningStatuses.some((s) => s === "PAID")) {
    return "partner_earning_paid_out";
  }
  return null;
}
