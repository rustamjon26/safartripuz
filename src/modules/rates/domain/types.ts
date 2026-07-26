export type LineItem = { code: string; tiyin: bigint };

export type NightQuote = {
  date: string; // YYYY-MM-DD
  baseTiyin: bigint;
  overrideTiyin: bigint | null;
  losAdjustmentTiyin: bigint;
  occupancyAdjustmentTiyin: bigint;
  promoDiscountTiyin: bigint;
  taxFeeTiyin: bigint;
  netTiyin: bigint;
  lineItems: LineItem[];
};

export type PricingState = {
  roomCount: number;
  nights: NightQuote[];
  appliedPromoIds: string[];
};

export type SeasonalOverrideRule = {
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  priceTiyin: bigint;
};

export type LosTier = { minNights: number; discountBps: bigint };

export type LosRuleInput = {
  minLos?: number | null;
  maxLos?: number | null;
  tiers: LosTier[];
};

export type OccupancyRuleInput = {
  /** Extra tiyin per night per extra adult beyond includedAdults */
  extraAdultTiyin?: bigint;
  extraChildTiyin?: bigint;
  includedAdults?: number;
  includedChildren?: number;
  adults: number;
  children: number;
};

export type PromotionRule = {
  id: string;
  code?: string | null;
  discountType: "PERCENT_BPS" | "FIXED_TIYIN";
  discountValue: bigint;
  stackGroup: string;
  priority: number;
  combinableWith: string[];
  maxDiscountTiyin?: bigint | null;
  /** When set, only apply if promo code matches (caller filters list). */
};

export type TaxFeeRuleInput = {
  id: string;
  name: string;
  type: "PERCENT_BPS" | "FIXED_TIYIN_PER_NIGHT" | "FIXED_TIYIN_PER_STAY";
  value: bigint;
  sortOrder: number;
};

export type PricingInput = {
  roomCount: number;
  /** Nightly base before overrides (already resolved for DERIVED if needed). */
  nightBases: Array<{ date: string; baseTiyin: bigint }>;
  seasonalOverrides: SeasonalOverrideRule[];
  losRules: LosRuleInput[];
  occupancy: OccupancyRuleInput;
  promotions: PromotionRule[];
  taxFeeRules: TaxFeeRuleInput[];
};

export type FinalQuote = {
  nights: NightQuote[];
  /** Sum of night.netTiyin across nights (already includes roomCount in night nets). */
  totalTiyin: bigint;
  currency: "UZS";
  appliedPromoIds: string[];
  breakdown: {
    subtotalTiyin: bigint;
    promoTotalTiyin: bigint;
    taxFeeTotalTiyin: bigint;
    roomCount: number;
    nightCount: number;
  };
};
