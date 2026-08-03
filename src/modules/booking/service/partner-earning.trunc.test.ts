import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { Money } from "@/src/shared/money";
import { reversePartnerEarningInTx } from "./partner-earning";

const som = (tiyin: bigint) => Money.fromTiyin(tiyin).toSomNumber();

function makeTx(earning: {
  grossTiyin: bigint;
  feeTiyin: bigint;
  netTiyin: bigint;
}) {
  const update = vi.fn(
    async (_args: { where: unknown; data: Record<string, unknown> }) => ({}),
  );
  const tx = {
    partnerEarning: {
      findUnique: vi.fn(async () => ({
        id: "pe1",
        status: "PENDING",
        grossAmount: { toString: () => som(earning.grossTiyin).toFixed(2) },
        commissionFee: { toString: () => som(earning.feeTiyin).toFixed(2) },
        netAmount: { toString: () => som(earning.netTiyin).toFixed(2) },
      })),
      update,
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, update };
}

describe("reversePartnerEarningInTx — trunc parity with ledger refund", () => {
  it("keeps exactly gross - refundTiyin (computeRefund truncation)", async () => {
    // gross = 101 som = 10_100 tiyin, 30% refund.
    // computeRefund: refund = (10100*30)/100 = 3030 → retained 7070.
    // Old buggy math: (10100*70)/100 = 7070 — same here, so pick a case that
    // actually diverges: gross 10101 tiyin, 30% → refund 3030 (trunc 3030.3),
    // retained 7071. Old math: (10101*70)/100 = 7070 (drift −1 tiyin).
    const gross = 10_101n;
    const fee = 1_010n;
    const net = gross - fee; // 9_091
    const { tx, update } = makeTx({ grossTiyin: gross, feeTiyin: fee, netTiyin: net });

    await reversePartnerEarningInTx(tx, "HOTEL", "hb1", 30);

    const refundGross = (gross * 30n) / 100n; // 3030
    const refundFee = (fee * 30n) / 100n; // 303
    const refundNet = refundGross - refundFee; // 2727

    const data = update.mock.calls[0]?.[0] as unknown as {
      data: { grossAmount: number; commissionFee: number; netAmount: number };
    };
    expect(data.data.grossAmount).toBe(som(gross - refundGross)); // 7071 tiyin
    expect(data.data.commissionFee).toBe(som(fee - refundFee)); // 707
    expect(data.data.netAmount).toBe(som(net - refundNet)); // 6364

    // Invariant preserved: fee + net == gross after reverse.
    const nextGross = Money.fromSomNumber(
      data.data.grossAmount.toFixed(2),
    ).toTiyin();
    const nextFee = Money.fromSomNumber(
      data.data.commissionFee.toFixed(2),
    ).toTiyin();
    const nextNet = Money.fromSomNumber(
      data.data.netAmount.toFixed(2),
    ).toTiyin();
    expect(nextFee + nextNet).toBe(nextGross);
  });

  it("cancels fully at 100%", async () => {
    const { tx, update } = makeTx({
      grossTiyin: 10_000n,
      feeTiyin: 1_000n,
      netTiyin: 9_000n,
    });
    await reversePartnerEarningInTx(tx, "HOTEL", "hb1", 100);
    const call = update.mock.calls[0]?.[0] as unknown as {
      data: { status?: string };
    };
    expect(call.data.status).toBe("CANCELLED");
  });
});
