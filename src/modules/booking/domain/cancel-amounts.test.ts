import { describe, expect, it } from "vitest";
import {
  assertCancelAmountsBalance,
  CancelAccountingDriftError,
  originalGrossFromRefund,
  refundSplitTiyin,
  resolveCancelAmounts,
} from "./cancel-amounts";
import { computeRefund, type RefundBreakdown } from "./refund";
import { calcPlatformCommissionTiyin } from "@/src/modules/ledger";

/** The formula this change removed: gross recovered by inverting the percent. */
function invertedGross(refund: RefundBreakdown): bigint {
  return refund.refundPercent > 0
    ? (refund.refundTiyin * 100n) / BigInt(refund.refundPercent)
    : refund.refundTiyin + refund.retainedTiyin;
}

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

describe("originalGrossFromRefund", () => {
  it("recovers the gross exactly for amounts that do not divide evenly", () => {
    // 10_101 @ 30%: forward floors 3030.3 → 3030, so inverting gives 10_100.
    const gross = 10_101n;
    const refund = refundOf(gross, 30);

    expect(refund.refundTiyin).toBe(3_030n);
    expect(originalGrossFromRefund(refund)).toBe(gross);
    expect(invertedGross(refund)).toBe(10_100n);
  });

  it("holds across a wide sweep of odd amounts and percentages", () => {
    for (let gross = 1n; gross <= 400n; gross += 1n) {
      for (const percent of [1, 3, 7, 13, 30, 33, 50, 66, 99, 100]) {
        const refund = refundOf(gross, percent);
        expect(originalGrossFromRefund(refund)).toBe(gross);
      }
    }
  });

  it("agrees with what computeRefund actually produces", () => {
    const gross = 999_983n; // prime-ish, divides cleanly by nothing useful
    const refund = computeRefund({
      checkInAt: new Date("2026-09-10T12:00:00Z"),
      bookedAt: new Date("2026-09-01T12:00:00Z"),
      cancelledAt: new Date("2026-09-05T12:00:00Z"),
      grossPaidTiyin: gross,
      policy: {
        rules: [{ id: "r", hoursBeforeCheckIn: 24, refundPercent: 37 }],
      },
    });
    expect(refund.refundPercent).toBe(37);
    expect(originalGrossFromRefund(refund)).toBe(gross);
  });
});

describe("resolveCancelAmounts", () => {
  it("prefers the commission the ledger actually posted", () => {
    const refund = refundOf(10_101n, 30);
    const resolved = resolveCancelAmounts({
      refund,
      ratePercent: 10,
      posted: { grossTiyin: 10_101n, commissionTiyin: 1_010n },
    });

    expect(resolved.source).toBe("ledger");
    expect(resolved.originalCommissionTiyin).toBe(1_010n);
  });

  it("survives a commission-rate change between booking and cancel", () => {
    const refund = refundOf(1_000_000n, 50);
    // Charged at 10%, but the setting says 15% by the time we cancel.
    const resolved = resolveCancelAmounts({
      refund,
      ratePercent: 15,
      posted: { grossTiyin: 1_000_000n, commissionTiyin: 100_000n },
    });

    expect(resolved.originalCommissionTiyin).toBe(100_000n);
    expect(resolved.originalCommissionTiyin).not.toBe(150_000n);
  });

  it("recomputes from the exact gross when no ledger posting exists", () => {
    const refund = refundOf(10_099n, 3);
    const resolved = resolveCancelAmounts({
      refund,
      ratePercent: 10,
      posted: null,
    });

    expect(resolved.source).toBe("rate");
    expect(resolved.originalGrossTiyin).toBe(10_099n);
    expect(resolved.originalCommissionTiyin).toBe(
      calcPlatformCommissionTiyin(10_099n, 10).platformTotal,
    );
  });
});

describe("regression: inverted gross skewed the commission clawback", () => {
  it("3% refund on 10_099 tiyin no longer loses 3 tiyin of commission", () => {
    const gross = 10_099n;
    const refund = refundOf(gross, 3);

    // Old path: invert → 10_066, then commission on the wrong gross.
    const wrongGross = invertedGross(refund);
    expect(wrongGross).toBe(10_066n);
    const wrongCommission =
      calcPlatformCommissionTiyin(wrongGross, 10).platformTotal;
    const rightCommission =
      calcPlatformCommissionTiyin(gross, 10).platformTotal;
    expect(rightCommission - wrongCommission).toBe(3n);

    const resolved = resolveCancelAmounts({
      refund,
      ratePercent: 10,
      posted: null,
    });
    expect(resolved.originalCommissionTiyin).toBe(rightCommission);
  });

  it("no percentage/amount pair drifts once gross comes from the split", () => {
    let inversionDrifts = 0;
    for (let gross = 1n; gross <= 2_000n; gross += 7n) {
      for (const percent of [1, 3, 7, 11, 23, 37, 61, 97]) {
        const refund = refundOf(gross, percent);
        if (refund.refundTiyin === 0n) continue;
        if (invertedGross(refund) !== gross) inversionDrifts += 1;
        expect(originalGrossFromRefund(refund)).toBe(gross);
      }
    }
    // The old formula really was lossy across this sweep.
    expect(inversionDrifts).toBeGreaterThan(0);
  });
});

describe("assertCancelAmountsBalance", () => {
  const base = { refund: refundOf(10_101n, 30), originalGrossTiyin: 10_101n };

  it("accepts a consistent reversal", () => {
    expect(() =>
      assertCancelAmountsBalance({ ...base, originalCommissionTiyin: 1_010n }),
    ).not.toThrow();
  });

  it("throws when refund + retained does not add back to gross", () => {
    expect(() =>
      assertCancelAmountsBalance({
        refund: refundOf(10_101n, 30),
        originalGrossTiyin: 10_100n,
        originalCommissionTiyin: 1_010n,
      }),
    ).toThrow(CancelAccountingDriftError);
  });

  it("throws when commission exceeds the gross it came from", () => {
    expect(() =>
      assertCancelAmountsBalance({ ...base, originalCommissionTiyin: 20_000n }),
    ).toThrow(CancelAccountingDriftError);
  });

  it("throws when a full refund would not claw back the whole commission", () => {
    const refund: RefundBreakdown = {
      ...refundOf(10_101n, 100),
      // Manufactured drift: the 100% leg no longer equals the gross.
      refundTiyin: 10_100n,
      retainedTiyin: 1n,
    };
    expect(() =>
      assertCancelAmountsBalance({
        refund,
        originalGrossTiyin: 10_101n,
        originalCommissionTiyin: 1_010n,
      }),
    ).toThrow(/100% refund/);
  });

  it("keeps the posted legs adding back to the refunded amount", () => {
    for (let gross = 1n; gross <= 500n; gross += 3n) {
      for (const percent of [1, 17, 50, 83, 100]) {
        const refund = refundOf(gross, percent);
        if (refund.refundTiyin === 0n) continue;
        const commission =
          calcPlatformCommissionTiyin(gross, 10).platformTotal;
        const split = refundSplitTiyin({
          refundTiyin: refund.refundTiyin,
          refundPercent: refund.refundPercent,
          originalCommissionTiyin: commission,
        });
        expect(
          split.commissionRefundTiyin + split.partnerClawbackTiyin,
        ).toBe(refund.refundTiyin);
        expect(() =>
          assertCancelAmountsBalance({
            refund,
            originalGrossTiyin: gross,
            originalCommissionTiyin: commission,
          }),
        ).not.toThrow();
      }
    }
  });
});
