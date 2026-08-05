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
        grossTiyin: 1_000_000n,
        commissionRate: 10,
        commissionFeeTiyin: 100_000n,
        netTiyin: 900_000n,
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
        grossTiyin: 5_000_000n,
        commissionRate: 10,
        commissionFeeTiyin: 500_000n,
        netTiyin: 4_500_000n,
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
    expect(res.earnings[0]?.commissionFeeSom).toBe(5000);
  });

  it("serializes line-item tiyin as strings (BigInt has no JSON form)", async () => {
    const res = await loadPartnerEarningsHybrid({
      partnerUserId: "partner_1",
      bookingType: "HOTEL",
    });

    const row = res.earnings[0];
    expect(row?.grossTiyin).toBe("1000000");
    expect(row?.commissionFeeTiyin).toBe("100000");
    expect(row?.netTiyin).toBe("900000");
    expect(row?.grossSom).toBe(10_000);
    expect(row?.netSom).toBe(9_000);
    expect(() => JSON.stringify(res)).not.toThrow();
  });
});
