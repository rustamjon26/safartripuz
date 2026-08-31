import { describe, expect, it } from "vitest";
import { computeGuestCancelRefund } from "../domain/guest-cancel";

/**
 * Guards the invariant behind resolveNonHotelPaidTiyin: an unpaid booking must
 * never produce a refund, because postCancelAccountingInTx would otherwise post
 * compensating ledger entries for money that was never collected.
 */
describe("guest cancel refund on unpaid bookings", () => {
  const checkInAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const bookedAt = new Date(Date.now() - 60 * 60 * 1000);

  it("returns zero refund when nothing was paid", () => {
    const refund = computeGuestCancelRefund({
      checkInAt,
      bookedAt,
      grossPaidTiyin: 0n,
    });
    expect(refund.refundTiyin).toBe(0n);
    expect(refund.retainedTiyin).toBe(0n);
  });

  it("still refunds a paid booking under the flexible policy", () => {
    const refund = computeGuestCancelRefund({
      checkInAt,
      bookedAt,
      grossPaidTiyin: 1_000_000n,
    });
    expect(refund.refundTiyin).toBeGreaterThan(0n);
  });
});
