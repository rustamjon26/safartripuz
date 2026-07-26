import { describe, expect, it } from "vitest";
import { assertBalanced, UnbalancedLedgerError } from "./balance";
import { splitBookingCommission } from "./commission";

describe("ledger.invariant", () => {
  it("accepts balanced debit/credit", () => {
    expect(() =>
      assertBalanced([
        { amount: 1000n, direction: "DEBIT" },
        { amount: 100n, direction: "CREDIT" },
        { amount: 900n, direction: "CREDIT" },
      ]),
    ).not.toThrow();
  });

  it("rejects unbalanced batch", () => {
    expect(() =>
      assertBalanced([
        { amount: 1000n, direction: "DEBIT" },
        { amount: 900n, direction: "CREDIT" },
      ]),
    ).toThrow(UnbalancedLedgerError);
  });

  it("sample booking payment posting is balanced", () => {
    const gross = 100_000n;
    const { platformTotal, partnerNet } = splitBookingCommission(gross);
    expect(() =>
      assertBalanced([
        { amount: gross, direction: "DEBIT" },
        { amount: partnerNet, direction: "CREDIT" },
        { amount: platformTotal, direction: "CREDIT" },
      ]),
    ).not.toThrow();
  });
});
