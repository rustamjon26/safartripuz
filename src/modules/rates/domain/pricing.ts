/**
 * Pure pricing pipeline — no I/O, no prisma, no Date.now().
 * All money is bigint tiyin. Division uses FLOOR (see moneyMath).
 */
import { applyBpsFloor, clampNonNegative, sumBigint } from "./moneyMath";
import { selectStackablePromotions } from "./stacking";
import type {
  FinalQuote,
  NightQuote,
  PricingInput,
  PricingState,
  PromotionRule,
  TaxFeeRuleInput,
} from "./types";

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** Inclusive day count of a YYYY-MM-DD range, used only to compare specificity. */
function rangeSpanDays(rule: { startDate: string; endDate: string }): number {
  const start = Date.parse(`${rule.startDate}T00:00:00Z`);
  const end = Date.parse(`${rule.endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.MAX_SAFE_INTEGER;
  return Math.floor((end - start) / 86_400_000) + 1;
}

/**
 * Which override wins when several cover the same night.
 *
 * **Most specific date range wins**: the narrowest window, because that is how
 * an operator layers rules — a broad "summer season" with a narrow "Navruz
 * week" carved out of it, expecting the narrow one to apply.
 *
 * Ties break on the later `startDate`, then on `priceTiyin`, so the result is
 * deterministic even when two rules describe the same window. Before this, the
 * winner was whichever row the database happened to return first — the query
 * has no ORDER BY, so the same booking could be priced differently on a replica.
 */
export function pickSeasonalOverride<
  T extends { startDate: string; endDate: string; priceTiyin: bigint },
>(candidates: T[], date: string): T | null {
  let best: T | null = null;

  for (const rule of candidates) {
    if (!dateInRange(date, rule.startDate, rule.endDate)) continue;
    if (best === null) {
      best = rule;
      continue;
    }

    const span = rangeSpanDays(rule);
    const bestSpan = rangeSpanDays(best);
    if (span !== bestSpan) {
      if (span < bestSpan) best = rule;
      continue;
    }
    if (rule.startDate !== best.startDate) {
      if (rule.startDate > best.startDate) best = rule;
      continue;
    }
    if (rule.priceTiyin !== best.priceTiyin && rule.priceTiyin > best.priceTiyin) {
      best = rule;
    }
  }

  return best;
}

export function resolveBaseRate(input: PricingInput): PricingState {
  const nights: NightQuote[] = input.nightBases.map((n) => ({
    date: n.date,
    baseTiyin: n.baseTiyin,
    overrideTiyin: null,
    losAdjustmentTiyin: 0n,
    occupancyAdjustmentTiyin: 0n,
    promoDiscountTiyin: 0n,
    taxFeeTiyin: 0n,
    netTiyin: n.baseTiyin,
    lineItems: [{ code: "BASE", tiyin: n.baseTiyin }],
  }));
  return { roomCount: input.roomCount, nights, appliedPromoIds: [] };
}

export function applySeasonalOverride(state: PricingState, input: PricingInput): PricingState {
  const nights = state.nights.map((night) => {
    const hit = pickSeasonalOverride(input.seasonalOverrides, night.date);
    if (!hit) return night;
    const lineItems = [
      ...night.lineItems.filter((l) => l.code !== "BASE" && l.code !== "OVERRIDE"),
      { code: "OVERRIDE", tiyin: hit.priceTiyin },
    ];
    return {
      ...night,
      overrideTiyin: hit.priceTiyin,
      netTiyin: hit.priceTiyin,
      lineItems: [{ code: "BASE", tiyin: night.baseTiyin }, ...lineItems.filter((l) => l.code === "OVERRIDE")],
    };
  });
  return { ...state, nights };
}

/** Nightly rate before LOS/occupancy/promo/tax (override or base). */
function nightlySeed(night: NightQuote): bigint {
  return night.overrideTiyin ?? night.baseTiyin;
}

export function applyLengthOfStayRules(state: PricingState, input: PricingInput): PricingState {
  const nightCount = state.nights.length;
  let discountBps = 0n;
  for (const rule of input.losRules) {
    if (rule.minLos != null && nightCount < rule.minLos) continue;
    if (rule.maxLos != null && nightCount > rule.maxLos) continue;
    for (const tier of rule.tiers) {
      if (nightCount >= tier.minNights && tier.discountBps > discountBps) {
        discountBps = tier.discountBps;
      }
    }
  }
  if (discountBps === 0n) return state;

  const nights = state.nights.map((night) => {
    const seed = nightlySeed(night);
    const discount = applyBpsFloor(seed, discountBps);
    const losAdjustmentTiyin = -discount;
    const after = clampNonNegative(seed + losAdjustmentTiyin);
    return {
      ...night,
      losAdjustmentTiyin,
      netTiyin: after,
      lineItems: [
        ...night.lineItems.filter((l) => l.code !== "LOS"),
        { code: "LOS", tiyin: losAdjustmentTiyin },
      ],
    };
  });
  return { ...state, nights };
}

export function applyOccupancyAdjustment(state: PricingState, input: PricingInput): PricingState {
  const occ = input.occupancy;
  const includedA = occ.includedAdults ?? 2;
  const includedC = occ.includedChildren ?? 0;
  const extraA = Math.max(0, occ.adults - includedA);
  const extraC = Math.max(0, occ.children - includedC);
  const perNight =
    BigInt(extraA) * (occ.extraAdultTiyin ?? 0n) +
    BigInt(extraC) * (occ.extraChildTiyin ?? 0n);

  if (perNight === 0n) return state;

  const nights = state.nights.map((night) => {
    const seed = nightlySeed(night) + night.losAdjustmentTiyin;
    const after = clampNonNegative(seed + perNight);
    return {
      ...night,
      occupancyAdjustmentTiyin: perNight,
      netTiyin: after,
      lineItems: [
        ...night.lineItems.filter((l) => l.code !== "OCCUPANCY"),
        { code: "OCCUPANCY", tiyin: perNight },
      ],
    };
  });
  return { ...state, nights };
}

function applyOnePromoToNight(seed: bigint, promo: PromotionRule): bigint {
  let discount = 0n;
  if (promo.discountType === "PERCENT_BPS") {
    discount = applyBpsFloor(seed, promo.discountValue);
  } else {
    discount = promo.discountValue;
  }
  if (promo.maxDiscountTiyin != null && discount > promo.maxDiscountTiyin) {
    discount = promo.maxDiscountTiyin;
  }
  if (discount > seed) discount = seed;
  return discount;
}

export function applyPromotions(state: PricingState, input: PricingInput): PricingState {
  const selected = selectStackablePromotions(input.promotions);
  if (selected.length === 0) return state;

  const nights = state.nights.map((night) => {
    const seed =
      nightlySeed(night) + night.losAdjustmentTiyin + night.occupancyAdjustmentTiyin;
    let totalDiscount = 0n;
    const promoLines: { code: string; tiyin: bigint }[] = [];
    for (const promo of selected) {
      const d = applyOnePromoToNight(clampNonNegative(seed - totalDiscount), promo);
      totalDiscount += d;
      promoLines.push({ code: `PROMO:${promo.id}`, tiyin: -d });
    }
    const after = clampNonNegative(seed - totalDiscount);
    return {
      ...night,
      promoDiscountTiyin: -totalDiscount,
      netTiyin: after,
      lineItems: [
        ...night.lineItems.filter((l) => !l.code.startsWith("PROMO:")),
        ...promoLines,
      ],
    };
  });

  return {
    ...state,
    nights,
    appliedPromoIds: selected.map((p) => p.id),
  };
}

export function applyTaxesAndFees(state: PricingState, input: PricingInput): PricingState {
  const rules = [...input.taxFeeRules].sort((a, b) => a.sortOrder - b.sortOrder);
  if (rules.length === 0) return state;

  const staySubtotal = sumBigint(
    state.nights.map(
      (n) =>
        nightlySeed(n) +
        n.losAdjustmentTiyin +
        n.occupancyAdjustmentTiyin +
        n.promoDiscountTiyin,
    ),
  );

  // FIXED_TIYIN_PER_STAY: split FLOOR across nights; remainder on last night
  const stayFees = rules.filter((r) => r.type === "FIXED_TIYIN_PER_STAY");
  const stayFeeTotal = sumBigint(stayFees.map((r) => r.value));
  const nightCount = BigInt(state.nights.length || 1);
  const perNightStay = stayFeeTotal / nightCount;
  let stayRemainder = stayFeeTotal - perNightStay * nightCount;

  const nights = state.nights.map((night, idx) => {
    const preTax =
      nightlySeed(night) +
      night.losAdjustmentTiyin +
      night.occupancyAdjustmentTiyin +
      night.promoDiscountTiyin;

    let tax = 0n;
    const lines: { code: string; tiyin: bigint }[] = [];

    for (const rule of rules) {
      if (rule.type === "PERCENT_BPS") {
        const t = applyBpsFloor(preTax, rule.value);
        tax += t;
        lines.push({ code: `TAX:${rule.id}`, tiyin: t });
      } else if (rule.type === "FIXED_TIYIN_PER_NIGHT") {
        tax += rule.value;
        lines.push({ code: `TAX:${rule.id}`, tiyin: rule.value });
      }
    }

    let stayShare = perNightStay;
    if (idx === state.nights.length - 1) {
      stayShare += stayRemainder;
      stayRemainder = 0n;
    }
    if (stayShare > 0n) {
      tax += stayShare;
      lines.push({ code: "TAX:STAY", tiyin: stayShare });
    }

    void staySubtotal;
    return {
      ...night,
      taxFeeTiyin: tax,
      netTiyin: clampNonNegative(preTax + tax),
      lineItems: [...night.lineItems.filter((l) => !l.code.startsWith("TAX:")), ...lines],
    };
  });

  return { ...state, nights };
}

export function finalQuote(state: PricingState): FinalQuote {
  const roomCount = BigInt(state.roomCount);
  const nights = state.nights.map((n) => {
    const net = n.netTiyin * roomCount;
    return { ...n, netTiyin: net };
  });
  const totalTiyin = sumBigint(nights.map((n) => n.netTiyin));
  const promoTotalTiyin = sumBigint(
    nights.map((n) => -n.promoDiscountTiyin * roomCount),
  );
  const taxFeeTotalTiyin = sumBigint(nights.map((n) => n.taxFeeTiyin * roomCount));
  const subtotalTiyin = totalTiyin - taxFeeTotalTiyin + promoTotalTiyin;

  return {
    nights,
    totalTiyin,
    currency: "UZS",
    appliedPromoIds: state.appliedPromoIds,
    breakdown: {
      subtotalTiyin,
      promoTotalTiyin,
      taxFeeTotalTiyin,
      roomCount: state.roomCount,
      nightCount: state.nights.length,
    },
  };
}

export function runPricingPipeline(input: PricingInput): FinalQuote {
  let state = resolveBaseRate(input);
  state = applySeasonalOverride(state, input);
  state = applyLengthOfStayRules(state, input);
  state = applyOccupancyAdjustment(state, input);
  state = applyPromotions(state, input);
  state = applyTaxesAndFees(state, input);
  return finalQuote(state);
}

/** Serialize quote for JSON snapshot (bigint → string). */
export function quoteToJson(quote: FinalQuote): Record<string, unknown> {
  return {
    currency: quote.currency,
    totalTiyin: quote.totalTiyin.toString(),
    appliedPromoIds: quote.appliedPromoIds,
    breakdown: {
      subtotalTiyin: quote.breakdown.subtotalTiyin.toString(),
      promoTotalTiyin: quote.breakdown.promoTotalTiyin.toString(),
      taxFeeTotalTiyin: quote.breakdown.taxFeeTotalTiyin.toString(),
      roomCount: quote.breakdown.roomCount,
      nightCount: quote.breakdown.nightCount,
    },
    nights: quote.nights.map((n) => ({
      date: n.date,
      baseTiyin: n.baseTiyin.toString(),
      overrideTiyin: n.overrideTiyin?.toString() ?? null,
      losAdjustmentTiyin: n.losAdjustmentTiyin.toString(),
      occupancyAdjustmentTiyin: n.occupancyAdjustmentTiyin.toString(),
      promoDiscountTiyin: n.promoDiscountTiyin.toString(),
      taxFeeTiyin: n.taxFeeTiyin.toString(),
      netTiyin: n.netTiyin.toString(),
      lineItems: n.lineItems.map((l) => ({ code: l.code, tiyin: l.tiyin.toString() })),
    })),
  };
}

export type { TaxFeeRuleInput, PromotionRule };
