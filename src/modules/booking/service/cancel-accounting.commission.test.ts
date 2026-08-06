import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { RefundBreakdown } from "../domain/refund";

const postRefundCompensation = vi.hoisted(() =>
  vi.fn(async (_input: unknown, _tx?: unknown) => ({
    alreadyExisted: false,
    transactionId: "ltx1",
  })),
);
const reversePartnerEarningInTx = vi.hoisted(() => vi.fn(async () => {}));
const findBookingPaymentCharge = vi.hoisted(() =>
  vi.fn(
    async (
      _bookingId: string,
      _tx?: unknown,
    ): Promise<{ grossTiyin: bigint; commissionTiyin: bigint } | null> => null,
  ),
);

vi.mock("@/src/modules/ledger", () => ({
  ledgerService: { postRefundCompensation },
  ledgerRepository: { findBookingPaymentCharge },
  calcPlatformCommissionTiyin: (gross: bigint, rate: number) => {
    const platformTotal = (gross * BigInt(rate)) / 100n;
    return { platformTotal, partnerNet: gross - platformTotal };
  },
}));

vi.mock("./partner-earning", () => ({ reversePartnerEarningInTx }));

import { postCancelAccountingInTx } from "./cancel-accounting";

const tx = {} as Prisma.TransactionClient;

function refundOf(grossTiyin: bigint, percent: number): RefundBreakdown {
  const refundTiyin = (grossTiyin * BigInt(percent)) / 100n;
  return {
    refundPercent: percent,
    refundTiyin,
    retainedTiyin: grossTiyin - refundTiyin,
    matchedRuleId: "r1",
    hoursBeforeCheckIn: 48,
    hoursSinceBooking: 2,
  };
}

function sentCommission(): bigint {
  const input = postRefundCompensation.mock.calls[0]?.[0] as {
    originalCommissionTiyin: bigint;
  };
  return input.originalCommissionTiyin;
}

describe("postCancelAccountingInTx commission basis", () => {
  beforeEach(() => {
    postRefundCompensation.mockReset();
    reversePartnerEarningInTx.mockReset();
    findBookingPaymentCharge.mockReset();
    postRefundCompensation.mockResolvedValue({
      alreadyExisted: false,
      transactionId: "ltx1",
    });
  });

  it("uses the commission the payment actually posted", async () => {
    findBookingPaymentCharge.mockResolvedValue({
      grossTiyin: 10_099n,
      commissionTiyin: 1_009n,
    });

    await postCancelAccountingInTx(tx, {
      bookingType: "HOTEL",
      bookingId: "bk_1",
      partnerUserId: "p1",
      refund: refundOf(10_099n, 3),
      // Rate has since changed; the posted commission must still win.
      ratePercent: 15,
    });

    expect(sentCommission()).toBe(1_009n);
  });

  it("falls back to the exact gross, not an inverted percentage", async () => {
    findBookingPaymentCharge.mockResolvedValue(null);

    await postCancelAccountingInTx(tx, {
      bookingType: "HOMESTAY",
      bookingId: "hs_1",
      partnerUserId: "h1",
      refund: refundOf(10_099n, 3),
      ratePercent: 10,
    });

    // Exact gross 10_099 → 1_009. The old inverted gross (10_066) gave 1_006.
    expect(sentCommission()).toBe(1_009n);
    expect(sentCommission()).not.toBe(1_006n);
  });

  it("PLATFORM bookings still claw back the full refund from revenue", async () => {
    findBookingPaymentCharge.mockResolvedValue({
      grossTiyin: 10_000n,
      commissionTiyin: 10_000n,
    });

    await postCancelAccountingInTx(tx, {
      bookingType: "GUIDE",
      bookingId: "g_1",
      partnerUserId: null,
      refund: refundOf(10_000n, 50),
      ratePercent: 10,
      payoutOwnerType: "PLATFORM",
    });

    expect(sentCommission()).toBe(5_000n);
    expect(reversePartnerEarningInTx).not.toHaveBeenCalled();
  });

  it("throws instead of posting when the refund split does not add up", async () => {
    findBookingPaymentCharge.mockResolvedValue(null);

    await expect(
      postCancelAccountingInTx(tx, {
        bookingType: "HOTEL",
        bookingId: "bk_bad",
        partnerUserId: "p1",
        refund: {
          // 100% refund that does not equal the gross it claims to reverse.
          refundPercent: 100,
          refundTiyin: 9_999n,
          retainedTiyin: 1n,
          matchedRuleId: null,
          hoursBeforeCheckIn: 1,
          hoursSinceBooking: 1,
        },
        ratePercent: 10,
      }),
    ).rejects.toThrow(/100% refund/);

    expect(postRefundCompensation).not.toHaveBeenCalled();
  });

  it("skips entirely when there is nothing to refund", async () => {
    await postCancelAccountingInTx(tx, {
      bookingType: "HOTEL",
      bookingId: "bk_zero",
      partnerUserId: "p1",
      refund: refundOf(10_000n, 0),
      ratePercent: 10,
    });

    expect(findBookingPaymentCharge).not.toHaveBeenCalled();
    expect(postRefundCompensation).not.toHaveBeenCalled();
  });
});
