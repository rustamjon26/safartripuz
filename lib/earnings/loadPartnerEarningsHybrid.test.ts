import { beforeEach, describe, expect, it, vi } from "vitest";

const getPartnerBalanceSummary = vi.hoisted(() =>
  vi.fn(async () => ({
    payableTiyin: 900_000n,
    pendingNetTiyin: 900_000n,
    attributedCommissionTiyin: 100_000n,
  })),
);

const findMany = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock("@/src/modules/ledger", () => ({
  ledgerService: {
    getPartnerBalanceSummary,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerEarning: {
      findMany,
    },
  },
}));

import { loadPartnerEarningsHybrid } from "./loadPartnerEarningsHybrid";
import { Money } from "@/src/shared/money";

describe("loadPartnerEarningsHybrid", () => {
  beforeEach(() => {
    getPartnerBalanceSummary.mockReset();
    findMany.mockReset();
    getPartnerBalanceSummary.mockResolvedValue({
      payableTiyin: 900_000n,
      pendingNetTiyin: 900_000n,
      attributedCommissionTiyin: 100_000n,
    });
    findMany.mockResolvedValue([
      {
        id: "pe1",
        partnerId: "partner_1",
        bookingType: "HOTEL",
        bookingId: "bk1",
        grossAmount: 10000,
        commissionRate: 10,
        commissionFee: 1000,
        netAmount: 9000,
        status: "PENDING",
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it("summary totals match Ledger balances exactly (not PE recompute)", async () => {
    const res = await loadPartnerEarningsHybrid({
      partnerUserId: "partner_1",
      bookingType: "HOTEL",
    });

    expect(getPartnerBalanceSummary).toHaveBeenCalledWith("partner_1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { partnerId: "partner_1", bookingType: "HOTEL" },
      }),
    );

    // Exact Ledger → Money conversion (not sum of PE rows).
    expect(res.summary.totalNet).toBe(
      Money.fromTiyin(900_000n).toSomNumber(),
    );
    expect(res.summary.pendingNet).toBe(
      Money.fromTiyin(900_000n).toSomNumber(),
    );
    expect(res.summary.totalCommission).toBe(
      Money.fromTiyin(100_000n).toSomNumber(),
    );
    expect(res.summary.source).toBe("ledger");
    expect(res.earnings).toHaveLength(1);
    expect(res.summary.pendingCount).toBe(1);
  });

  it("PLATFORM-owned partner (no payable / no PE) shows zero balances", async () => {
    getPartnerBalanceSummary.mockResolvedValue({
      payableTiyin: 0n,
      pendingNetTiyin: 0n,
      attributedCommissionTiyin: 0n,
    });
    findMany.mockResolvedValue([]);

    const res = await loadPartnerEarningsHybrid({
      partnerUserId: "platform_ops",
      bookingType: "HOMESTAY",
    });

    expect(res.summary.totalNet).toBe(0);
    expect(res.summary.pendingNet).toBe(0);
    expect(res.summary.totalCommission).toBe(0);
    expect(res.summary.pendingCount).toBe(0);
    expect(res.earnings).toEqual([]);
  });

  it("does not derive commission from PartnerEarning.commissionFee sum", async () => {
    // PE says 5000 commission; Ledger says 100_000 tiyin (= 1000 som) — Ledger wins.
    findMany.mockResolvedValue([
      {
        id: "pe_x",
        partnerId: "partner_1",
        bookingType: "GUIDE",
        bookingId: "g1",
        grossAmount: 50000,
        commissionRate: 10,
        commissionFee: 5000,
        netAmount: 45000,
        status: "PENDING",
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    getPartnerBalanceSummary.mockResolvedValue({
      payableTiyin: 100n,
      pendingNetTiyin: 100n,
      attributedCommissionTiyin: 50n,
    });

    const res = await loadPartnerEarningsHybrid({
      partnerUserId: "partner_1",
      bookingType: "GUIDE",
    });

    expect(res.summary.totalCommission).toBe(Money.fromTiyin(50n).toSomNumber());
    expect(res.summary.totalCommission).not.toBe(5000);
    expect(res.earnings[0]?.commissionFee).toBe(5000);
  });
});
