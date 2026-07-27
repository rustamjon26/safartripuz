import { describe, expect, it } from "vitest";
import { assertBalanced } from "./balance";
import {
  calcPlatformCommissionTiyin,
  splitBookingCommission,
} from "./commission";
import { LedgerTxType } from "./types";
import { MissingPartnerError, LedgerService } from "../service/ledger.service";

describe("ledger event type constants", () => {
  it("includes required money event types", () => {
    expect(LedgerTxType.BOOKING_PAYMENT).toBe("BOOKING_PAYMENT");
    expect(LedgerTxType.REFUND).toBe("REFUND");
    expect(LedgerTxType.PARTIAL_REFUND).toBe("PARTIAL_REFUND");
    expect(LedgerTxType.PAYOUT).toBe("PAYOUT");
    expect(LedgerTxType.CHARGEBACK).toBe("CHARGEBACK");
    expect(LedgerTxType.CLAWBACK).toBe("CLAWBACK");
    expect(LedgerTxType.COMMISSION).toBe("COMMISSION");
  });
});

describe("commission BigInt only", () => {
  it("no float in split", () => {
    const r = splitBookingCommission(999n);
    expect(typeof r.platformTotal).toBe("bigint");
    expect(r.platformTotal + r.partnerNet).toBe(999n);
  });

  it("15% guide/taxi rate via calcPlatformCommissionTiyin", () => {
    const r = calcPlatformCommissionTiyin(1_000_000n, 15);
    expect(r.platformTotal).toBe(150_000n);
    expect(r.partnerNet).toBe(850_000n);
  });
});

describe("assertBalanced across event shapes", () => {
  it("BOOKING_PAYMENT shape", () => {
    const gross = 1_000_000n;
    const { platformTotal, partnerNet } = splitBookingCommission(gross);
    expect(() =>
      assertBalanced([
        { amount: gross, direction: "DEBIT" },
        { amount: partnerNet, direction: "CREDIT" },
        { amount: platformTotal, direction: "CREDIT" },
      ]),
    ).not.toThrow();
  });

  it("REFUND / PARTIAL / CLAWBACK shape", () => {
    const refund = 500_000n;
    const commissionRefund = 50_000n;
    const partnerClawback = refund - commissionRefund;
    expect(() =>
      assertBalanced([
        { amount: refund, direction: "CREDIT" },
        { amount: partnerClawback, direction: "DEBIT" },
        { amount: commissionRefund, direction: "DEBIT" },
      ]),
    ).not.toThrow();
  });

  it("PAYOUT shape", () => {
    expect(() =>
      assertBalanced([
        { amount: 100n, direction: "DEBIT" },
        { amount: 100n, direction: "CREDIT" },
      ]),
    ).not.toThrow();
  });
});

describe("MissingPartnerError on payment success", () => {
  it("postBookingPayment rejects empty partner", async () => {
    const svc = new LedgerService();
    await expect(
      svc.postBookingPayment({
        idempotencyKey: "t1",
        grossTiyin: 100n,
        partnerUserId: "",
      }),
    ).rejects.toBeInstanceOf(MissingPartnerError);
  });
});
