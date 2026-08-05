import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { reversePartnerEarningInTx } from "./partner-earning";

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
        grossTiyin: earning.grossTiyin,
        commissionFeeTiyin: earning.feeTiyin,
        netTiyin: earning.netTiyin,
      })),
      update,
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, update };
}

type ReverseData = {
  data: {
    grossTiyin: bigint;
    commissionFeeTiyin: bigint;
    netTiyin: bigint;
  };
};

describe("reversePartnerEarningInTx — trunc parity with ledger refund", () => {
  it("keeps exactly gross - refundTiyin (computeRefund truncation)", async () => {
    // gross 10101 tiyin, 30% → refund 3030 (trunc of 3030.3), retained 7071.
    // `(gross * remain) / 100n` would truncate the other way and give 7070.
    const gross = 10_101n;
    const fee = 1_010n;
    const net = gross - fee; // 9_091
    const { tx, update } = makeTx({
      grossTiyin: gross,
      feeTiyin: fee,
      netTiyin: net,
    });

    await reversePartnerEarningInTx(tx, "HOTEL", "hb1", 30);

    const refundGross = (gross * 30n) / 100n; // 3030
    const refundFee = (fee * 30n) / 100n; // 303
    const refundNet = refundGross - refundFee; // 2727

    const { data } = update.mock.calls[0]?.[0] as unknown as ReverseData;
    expect(data.grossTiyin).toBe(gross - refundGross); // 7071
    expect(data.commissionFeeTiyin).toBe(fee - refundFee); // 707
    expect(data.netTiyin).toBe(net - refundNet); // 6364

    // Invariant preserved: fee + net == gross after reverse.
    expect(data.commissionFeeTiyin + data.netTiyin).toBe(data.grossTiyin);
  });

  it("survives amounts beyond Number.MAX_SAFE_INTEGER tiyin", async () => {
    const gross = 90_071_992_547_409_930n; // > 2^53 tiyin
    const fee = 9_007_199_254_740_993n;
    const net = gross - fee;
    const { tx, update } = makeTx({
      grossTiyin: gross,
      feeTiyin: fee,
      netTiyin: net,
    });

    await reversePartnerEarningInTx(tx, "HOMESTAY", "hs1", 25);

    const { data } = update.mock.calls[0]?.[0] as unknown as ReverseData;
    expect(data.grossTiyin).toBe(gross - (gross * 25n) / 100n);
    expect(data.commissionFeeTiyin + data.netTiyin).toBe(data.grossTiyin);
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
