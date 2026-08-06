import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const postRefundCompensation = vi.hoisted(() =>
  vi.fn(
    async (_input: unknown, _tx?: unknown) => ({
      alreadyExisted: false,
      transactionId: "ltx1",
    }),
  ),
);

const reversePartnerEarningInTx = vi.hoisted(() =>
  vi.fn(
    async (
      _tx: unknown,
      _bookingType: unknown,
      _bookingId: unknown,
      _refundPercent: unknown,
    ) => {
      throw new Error("reverse boom");
    },
  ),
);

const findBookingPaymentCharge = vi.hoisted(() =>
  vi.fn(async (_bookingId: string, _tx?: unknown) => null),
);

vi.mock("@/src/modules/ledger", () => ({
  ledgerService: {
    postRefundCompensation,
  },
  ledgerRepository: {
    findBookingPaymentCharge,
  },
  calcPlatformCommissionTiyin: (gross: bigint, rate: number) => {
    const platformTotal = (gross * BigInt(rate)) / 100n;
    return { platformTotal, partnerNet: gross - platformTotal };
  },
}));

vi.mock("./partner-earning", () => ({
  reversePartnerEarningInTx,
}));

import { postCancelAccountingInTx } from "./cancel-accounting";

describe("postCancelAccountingInTx atomic failure", () => {
  beforeEach(() => {
    postRefundCompensation.mockReset();
    reversePartnerEarningInTx.mockReset();
    findBookingPaymentCharge.mockReset();
    findBookingPaymentCharge.mockResolvedValue(null);
    postRefundCompensation.mockResolvedValue({
      alreadyExisted: false,
      transactionId: "ltx1",
    });
    reversePartnerEarningInTx.mockRejectedValue(new Error("reverse boom"));
  });

  it("propagates reverse failure after ledger write (caller tx must roll back both)", async () => {
    const tx = {} as Prisma.TransactionClient;
    const refund = {
      refundPercent: 100,
      refundTiyin: 1_000_000n,
      retainedTiyin: 0n,
      matchedRuleId: "r1",
      hoursBeforeCheckIn: 48,
      hoursSinceBooking: 24,
    };

    await expect(
      postCancelAccountingInTx(tx, {
        bookingType: "HOTEL",
        bookingId: "bk_1",
        partnerUserId: "partner_1",
        refund,
        ratePercent: 10,
      }),
    ).rejects.toThrow(/reverse boom/);

    expect(postRefundCompensation).toHaveBeenCalledTimes(1);
    expect(postRefundCompensation.mock.calls[0]?.[1]).toBe(tx);
    expect(reversePartnerEarningInTx).toHaveBeenCalledWith(
      tx,
      "HOTEL",
      "bk_1",
      100,
    );
  });

  it("does not call reverse when ledger compensation throws", async () => {
    postRefundCompensation.mockRejectedValueOnce(new Error("ledger boom"));
    const tx = {} as Prisma.TransactionClient;

    await expect(
      postCancelAccountingInTx(tx, {
        bookingType: "HOMESTAY",
        bookingId: "hs_1",
        partnerUserId: "host_1",
        refund: {
          refundPercent: 50,
          refundTiyin: 500_000n,
          retainedTiyin: 500_000n,
          matchedRuleId: null,
          hoursBeforeCheckIn: 12,
          hoursSinceBooking: 6,
        },
        ratePercent: 10,
      }),
    ).rejects.toThrow(/ledger boom/);

    expect(reversePartnerEarningInTx).not.toHaveBeenCalled();
  });
});
