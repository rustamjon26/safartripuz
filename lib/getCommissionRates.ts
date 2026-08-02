import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcPlatformCommissionTiyin } from "@/src/modules/ledger/domain/commission";

export type CommissionRates = {
  HOTEL: number;
  HOMESTAY: number;
  GUIDE: number;
  TAXI: number;
};

/** Integer percent 0..100 (not float fractions). */
export const DEFAULT_COMMISSION_RATES: CommissionRates = {
  HOTEL: 10,
  HOMESTAY: 10,
  GUIDE: 15,
  TAXI: 15,
};

type RatesClient = Pick<typeof prisma, "systemSetting"> | Prisma.TransactionClient;

/** Coerce setting JSON to an integer percent in 0..100; else fallback. */
export function asRatePercent(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < 0 || i > 100) return fallback;
  return i;
}

/**
 * Percent → basis points (10% → 1000). Pure integer; no float multiply.
 */
export function ratePercentToBps(ratePercent: number): number {
  const i = asRatePercent(ratePercent, 0);
  return i * 100;
}

/**
 * Platform commission in tiyin from basis points.
 * Half-up round only at the final integer division boundary:
 *   round(gross * bps / 10000) ≡ (gross * bps + 5000) / 10000
 */
export function calcCommissionTiyinFromBps(
  grossTiyin: bigint,
  rateBps: number,
): { commissionFee: bigint; netAmount: bigint } {
  if (grossTiyin < 0n) throw new Error("grossTiyin must be >= 0");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new Error("rateBps must be integer 0..10000");
  }
  const commissionFee =
    (grossTiyin * BigInt(rateBps) + 5000n) / 10000n;
  return { commissionFee, netAmount: grossTiyin - commissionFee };
}

function mergeRates(raw: unknown): CommissionRates {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_COMMISSION_RATES;
  }
  const obj = raw as Record<string, unknown>;
  return {
    HOTEL: asRatePercent(obj.HOTEL, DEFAULT_COMMISSION_RATES.HOTEL),
    HOMESTAY: asRatePercent(obj.HOMESTAY, DEFAULT_COMMISSION_RATES.HOMESTAY),
    GUIDE: asRatePercent(obj.GUIDE, DEFAULT_COMMISSION_RATES.GUIDE),
    TAXI: asRatePercent(obj.TAXI, DEFAULT_COMMISSION_RATES.TAXI),
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
 * Pure BigInt commission in tiyin.
 * `ratePercent` is integer 0..100; delegates to platform commission (floor division
 * for ledger compatibility). Prefer {@link calcCommissionTiyinFromBps} when an
 * explicit half-up round at the bps boundary is required.
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
