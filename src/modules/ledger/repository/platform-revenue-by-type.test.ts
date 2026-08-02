import { describe, expect, it, vi } from "vitest";
import { LedgerRepository } from "./ledger.repository";

describe("sumPlatformRevenueByBookingTypeTiyin", () => {
  it("attributes PLATFORM homestay + PARTNER hotel revenue by bookingType", async () => {
    const repo = new LedgerRepository();
    vi.spyOn(repo, "ensureAccount").mockResolvedValue({ id: "acc_rev" } as never);

    const findMany = vi.fn().mockResolvedValue([
      {
        amount: 100_000n,
        direction: "CREDIT",
        transaction: { bookingType: "HOTEL" },
      },
      {
        amount: 500_000n,
        direction: "CREDIT",
        transaction: { bookingType: "HOMESTAY" },
      },
      {
        amount: 10_000n,
        direction: "DEBIT",
        transaction: { bookingType: "HOTEL" },
      },
      {
        amount: 1_000n,
        direction: "CREDIT",
        transaction: { bookingType: null },
      },
    ]);

    const result = await repo.sumPlatformRevenueByBookingTypeTiyin(
      {},
      { ledgerEntry: { findMany } } as never,
    );

    expect(result.get("HOTEL")).toBe(90_000n);
    expect(result.get("HOMESTAY")).toBe(500_000n);
    expect(result.has("GUIDE")).toBe(false);
  });
});
