import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CommissionRates = {
  HOTEL: number;
  HOMESTAY: number;
  GUIDE: number;
  TAXI: number;
};

export const DEFAULT_COMMISSION_RATES: CommissionRates = {
  HOTEL: 10,
  HOMESTAY: 10,
  GUIDE: 15,
  TAXI: 15,
};

type RatesClient = Pick<typeof prisma, "systemSetting"> | Prisma.TransactionClient;

function mergeRates(raw: unknown): CommissionRates {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_COMMISSION_RATES;
  }
  const obj = raw as Record<string, unknown>;
  return {
    HOTEL: Number(obj.HOTEL ?? DEFAULT_COMMISSION_RATES.HOTEL),
    HOMESTAY: Number(obj.HOMESTAY ?? DEFAULT_COMMISSION_RATES.HOMESTAY),
    GUIDE: Number(obj.GUIDE ?? DEFAULT_COMMISSION_RATES.GUIDE),
    TAXI: Number(obj.TAXI ?? DEFAULT_COMMISSION_RATES.TAXI),
  };
}

export async function getCommissionRates(
  client: RatesClient = prisma,
): Promise<CommissionRates> {
  try {
    const setting = await client.systemSetting.findUnique({
      where: { key: "commission_rates" },
    });
    if (!setting?.value) return DEFAULT_COMMISSION_RATES;
    return mergeRates(setting.value);
  } catch {
    return DEFAULT_COMMISSION_RATES;
  }
}

export function calcCommission(
  grossAmount: number,
  rate: number,
): { commissionFee: number; netAmount: number } {
  const commissionFee = Number((grossAmount * rate / 100).toFixed(2));
  const netAmount = Number((grossAmount - commissionFee).toFixed(2));
  return { commissionFee, netAmount };
}

/**
 * Pure BigInt commission in tiyin (floor division). Prefer for money-path tests + ledger.
 * `ratePercent` is 0..100 integer percent.
 */
export function calcCommissionTiyin(
  grossTiyin: bigint,
  ratePercent: number,
): { commissionFee: bigint; netAmount: bigint } {
  if (grossTiyin < 0n) throw new Error("grossTiyin must be >= 0");
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    throw new Error("ratePercent must be 0..100");
  }
  const rate = BigInt(Math.floor(ratePercent));
  const commissionFee = (grossTiyin * rate) / 100n;
  return { commissionFee, netAmount: grossTiyin - commissionFee };
}
