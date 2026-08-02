import { describe, expect, it, vi } from "vitest";
import { LedgerRepository } from "./ledger.repository";

describe("sumPartnerAttributedCommissionTiyin", () => {
  it("sums PLATFORM REVENUE on txs that touch partner payable", async () => {
    const ensureAccount = vi
      .fn()
      .mockResolvedValueOnce({ id: "acc_payable" })
      .mockResolvedValueOnce({ id: "acc_revenue" });

    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ transactionId: "tx1" }, { transactionId: "tx2" }])
      .mockResolvedValueOnce([
        { amount: 100_000n, direction: "CREDIT" },
        { amount: 20_000n, direction: "CREDIT" },
        { amount: 10_000n, direction: "DEBIT" },
      ]);

    const client = {
      ledgerAccount: { upsert: ensureAccount },
      ledgerEntry: { findMany },
    };

    const repo = new LedgerRepository();
    // Bypass ensureAccount upsert path by stubbing method
    vi.spyOn(repo, "ensureAccount").mockImplementation(async (input) => {
      if (input.type === "LIABILITY") return { id: "acc_payable" } as never;
      return { id: "acc_revenue" } as never;
    });

    const result = await repo.sumPartnerAttributedCommissionTiyin(
      "partner_1",
      client as never,
    );

    expect(result).toBe(110_000n);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { accountId: "acc_payable" },
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          accountId: "acc_revenue",
          transactionId: { in: ["tx1", "tx2"] },
        },
      }),
    );
  });

  it("returns 0 when partner has no payable entries (PLATFORM path)", async () => {
    const repo = new LedgerRepository();
    vi.spyOn(repo, "ensureAccount").mockResolvedValue({ id: "acc_x" } as never);
    const findMany = vi.fn().mockResolvedValueOnce([]);
    const client = { ledgerEntry: { findMany } };

    const result = await repo.sumPartnerAttributedCommissionTiyin(
      "nobody",
      client as never,
    );
    expect(result).toBe(0n);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
