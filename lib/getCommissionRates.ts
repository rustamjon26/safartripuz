import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcPlatformCommissionTiyin } from "@/src/modules/ledger/domain/commission";

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

/**
 * @deprecated Float money path removed. Use calcCommissionTiyin / calcPlatformCommissionTiyin.
 */
export function calcCommission(_grossAmount: number, _rate: number): never {
  throw new Error(
    "calcCommission (float) is removed — use calcCommissionTiyin / calcPlatformCommissionTiyin",
  );
}

/**
 * Pure BigInt commission in tiyin (floor division).
 * `ratePercent` is 0..100 integer percent.
 */
export function calcCommissionTiyin(
  grossTiyin: bigint,
  ratePercent: number,
): { commissionFee: bigint; netAmount: bigint } {
  const { platformTotal, partnerNet } = calcPlatformCommissionTiyin(
    grossTiyin,
    ratePercent,
  );
  return { commissionFee: platformTotal, netAmount: partnerNet };
}
