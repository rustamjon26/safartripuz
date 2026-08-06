import { describe, expect, it } from "vitest";
import {
  paymentIdFromLedgerKey,
  reconcileLedgerPartnerEarnings,
  reconcilePaymentsAgainstLedger,
  type ReconcilePaymentRow,
} from "./reconcile-ledger";

function payment(over: Partial<ReconcilePaymentRow> = {}): ReconcilePaymentRow {
  return {
    id: "pay_1",
    status: "SUCCESS",
    amountTiyin: 1_000_000n,
    postedClearingTiyin: 1_000_000n,
    createdAt: new Date("2026-08-05"),
    ...over,
  };
}

describe("reconcilePaymentsAgainstLedger", () => {
  it("passes when the clearing DEBIT matches the captured amount", () => {
    expect(reconcilePaymentsAgainstLedger([payment()])).toEqual([]);
  });

  it("flags a SUCCESS payment whose ledger is short", () => {
    // The original bug: plan of 1_000_000, one booking expired, only half posted.
    const findings = reconcilePaymentsAgainstLedger([
      payment({ postedClearingTiyin: 500_000n }),
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.check).toBe("PAYMENT_LEDGER_MISMATCH");
    expect(findings[0]?.paymentId).toBe("pay_1");
    expect(findings[0]?.expected).toBe("1000000");
    expect(findings[0]?.actual).toBe("500000");
    expect(findings[0]?.deltaTiyin).toBe("-500000");
    expect(findings[0]?.detail).toContain("SUCCESS");
  });

  it("flags a SUCCESS payment with no ledger entry at all", () => {
    const findings = reconcilePaymentsAgainstLedger([
      payment({ postedClearingTiyin: 0n }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.deltaTiyin).toBe("-1000000");
  });

  it("flags over-posting as well as under-posting", () => {
    const findings = reconcilePaymentsAgainstLedger([
      payment({ postedClearingTiyin: 1_500_000n }),
    ]);
    expect(findings[0]?.deltaTiyin).toBe("500000");
  });

  it("reports PENDING_REVIEW as awaiting ops, not as a silent gap", () => {
    const findings = reconcilePaymentsAgainstLedger([
      payment({ status: "PENDING_REVIEW", postedClearingTiyin: 400_000n }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain("PENDING_REVIEW");
    expect(findings[0]?.detail).toContain("awaiting ops");
  });

  it("stays quiet for a fully posted PENDING_REVIEW payment", () => {
    expect(
      reconcilePaymentsAgainstLedger([payment({ status: "PENDING_REVIEW" })]),
    ).toEqual([]);
  });
});

describe("paymentIdFromLedgerKey", () => {
  it("extracts the payment id from the settlement key", () => {
    expect(
      paymentIdFromLedgerKey("payment:pay_abc:booking:hb_1:success"),
    ).toBe("pay_abc");
  });

  it("ignores keys from other ledger paths", () => {
    expect(paymentIdFromLedgerKey("payme:tx_1")).toBeNull();
    expect(paymentIdFromLedgerKey("refund:HOTEL:hb_1:100")).toBeNull();
    expect(paymentIdFromLedgerKey("payment:")).toBeNull();
  });
});

describe("full report includes the payment check", () => {
  const emptyBookingSide = {
    since: null,
    bookings: [],
    partnerEarnings: [],
    ledgerTxs: [],
    knownBookingIds: new Set<string>(),
  };

  it("a manufactured mismatch makes the report dirty", () => {
    const report = reconcileLedgerPartnerEarnings({
      ...emptyBookingSide,
      payments: [payment({ postedClearingTiyin: 999_999n })],
    });

    expect(report.clean).toBe(false);
    expect(report.counts.PAYMENT_LEDGER_MISMATCH).toBe(1);
    expect(
      report.findings.find((f) => f.check === "PAYMENT_LEDGER_MISMATCH")
        ?.deltaTiyin,
    ).toBe("-1");
  });

  it("clean books stay clean", () => {
    const report = reconcileLedgerPartnerEarnings({
      ...emptyBookingSide,
      payments: [payment()],
    });
    expect(report.clean).toBe(true);
    expect(report.counts.PAYMENT_LEDGER_MISMATCH).toBe(0);
  });
});
