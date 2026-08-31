import { describe, expect, it } from "vitest";
import { ledgerPlatformFeesToBuckets } from "./revenuePlatformFees";
import { Money } from "@/src/shared/money";

describe("ledgerPlatformFeesToBuckets (admin revenue per-type)", () => {
  it("shows PARTNER hotel commission and PLATFORM homestay full revenue", () => {
    // PARTNER hotel: 10% of 1_000_000 tiyin = 100_000 tiyin platform fee
    // PLATFORM homestay: 100% of 500_000 tiyin revenue (no PE row exists)
    const byType = new Map([
      ["HOTEL", 100_000n],
      ["HOMESTAY", 500_000n],
    ] as const);

    const fees = ledgerPlatformFeesToBuckets(new Map(byType));

    expect(fees.HOTEL).toBe(Money.fromTiyin(100_000n).toSomNumber());
    expect(fees.HOMESTAY).toBe(Money.fromTiyin(500_000n).toSomNumber());
    expect(fees.GUIDE).toBe(0);
    expect(fees.TAXI).toBe(0);

    // Previously PE-only groupBy would hide PLATFORM HOMESTAY entirely.
    expect(fees.HOMESTAY).toBeGreaterThan(0);
  });
});
