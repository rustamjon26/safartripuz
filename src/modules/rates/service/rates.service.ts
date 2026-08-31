import { Money } from "@/src/shared/money";
import { enumerateNights, formatDateOnly } from "@/src/modules/inventory";
import { quoteToJson, runPricingPipeline } from "../domain/pricing";
import type { FinalQuote, PricingInput } from "../domain/types";
import { ratesRepository } from "../repository/rates.repository";

export type QuoteHotelInput = {
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  roomCount: number;
  adults?: number;
  children?: number;
  promoCodes?: string[];
};

export type QuoteHomestayInput = {
  pricePerNightSom: number | string;
  checkIn: Date;
  checkOut: Date;
  adults?: number;
  children?: number;
  promoCodes?: string[];
};

export type QuoteGuideInput = {
  pricePerHourSom: number | string;
  hours: number;
};

export type QuoteGuideDailyInput = {
  pricePerDaySom: number | string;
  days: number;
};

export class RatesService {
  async quoteHotel(input: QuoteHotelInput): Promise<FinalQuote & { snapshot: Record<string, unknown>; totalSom: number }> {
    const roomType = await ratesRepository.findRoomType(input.roomTypeId);
    if (!roomType) {
      throw new Error(`RoomType not found: ${input.roomTypeId}`);
    }

    const plan = await ratesRepository.findActiveBasePlan(input.roomTypeId);
    const baseTiyin = ratesRepository.resolveBaseTiyin(plan, roomType.basePrice);
    const nightDates = enumerateNights(input.checkIn, input.checkOut);
    const nightBases = nightDates.map((d) => ({
      date: formatDateOnly(d),
      baseTiyin,
    }));

    const seasonalOverrides = plan
      ? await ratesRepository.loadOverridesForRange(plan.id, input.checkIn, input.checkOut)
      : [];
    const promotions = await ratesRepository.loadActivePromotions(input.promoCodes);
    const taxFeeRules = await ratesRepository.loadTaxFeeRules();
    const losRules = await ratesRepository.loadLosRules(plan?.id ?? null);

    const pricingInput: PricingInput = {
      roomCount: input.roomCount,
      nightBases,
      seasonalOverrides,
      losRules,
      occupancy: {
        adults: input.adults ?? 2,
        children: input.children ?? 0,
        includedAdults: roomType.capacityAdults,
        includedChildren: roomType.capacityChildren,
      },
      promotions,
      taxFeeRules,
    };

    const quote = runPricingPipeline(pricingInput);
    return {
      ...quote,
      snapshot: quoteToJson(quote),
      totalSom: Money.fromTiyin(quote.totalTiyin).toSomNumber(),
    };
  }

  /**
   * Homestay v1: synthetic BASE context from listing pricePerNight (no RatePlan rows).
   */
  async quoteHomestay(input: QuoteHomestayInput): Promise<FinalQuote & { snapshot: Record<string, unknown>; totalSom: number }> {
    const baseTiyin = Money.fromSomNumber(input.pricePerNightSom).toTiyin();
    const nightDates = enumerateNights(input.checkIn, input.checkOut);
    const nightBases = nightDates.map((d) => ({
      date: formatDateOnly(d),
      baseTiyin,
    }));

    const promotions = await ratesRepository.loadActivePromotions(input.promoCodes);
    const taxFeeRules = await ratesRepository.loadTaxFeeRules();

    const quote = runPricingPipeline({
      roomCount: 1,
      nightBases,
      seasonalOverrides: [],
      losRules: [],
      occupancy: {
        adults: input.adults ?? 2,
        children: input.children ?? 0,
      },
      promotions,
      taxFeeRules,
    });

    return {
      ...quote,
      snapshot: quoteToJson(quote),
      totalSom: Money.fromTiyin(quote.totalTiyin).toSomNumber(),
    };
  }

  /** Hourly guide quote — pure unit math via pipeline as single "night" proxy. */
  quoteGuide(input: QuoteGuideInput): FinalQuote & { snapshot: Record<string, unknown>; totalSom: number } {
    if (input.hours <= 0) {
      throw new Error("hours must be > 0");
    }
    const unitTiyin = Money.fromSomNumber(input.pricePerHourSom).toTiyin();
    // Represent hours as fractional nights via fixed tiyin total: hours * unit
    // Pipeline expects nights; use one synthetic night with base = hours * unit.
    const hoursMillis = Math.round(input.hours * 1000);
    const totalUnit = (unitTiyin * BigInt(hoursMillis)) / 1000n;

    const quote = runPricingPipeline({
      roomCount: 1,
      nightBases: [{ date: "1970-01-01", baseTiyin: totalUnit }],
      seasonalOverrides: [],
      losRules: [],
      occupancy: { adults: 1, children: 0 },
      promotions: [],
      taxFeeRules: [],
    });

    return {
      ...quote,
      snapshot: quoteToJson(quote),
      totalSom: Money.fromTiyin(quote.totalTiyin).toSomNumber(),
    };
  }

  quoteGuideDaily(input: QuoteGuideDailyInput): FinalQuote & { snapshot: Record<string, unknown>; totalSom: number } {
    if (input.days <= 0) throw new Error("days must be > 0");
    const unitTiyin = Money.fromSomNumber(input.pricePerDaySom).toTiyin();
    const start = new Date(Date.UTC(1970, 0, 1));
    const nightBases = Array.from({ length: input.days }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return { date: formatDateOnly(d), baseTiyin: unitTiyin };
    });

    const quote = runPricingPipeline({
      roomCount: 1,
      nightBases,
      seasonalOverrides: [],
      losRules: [],
      occupancy: { adults: 1, children: 0 },
      promotions: [],
      taxFeeRules: [],
    });

    return {
      ...quote,
      snapshot: quoteToJson(quote),
      totalSom: Money.fromTiyin(quote.totalTiyin).toSomNumber(),
    };
  }

  /** Sync BASE RatePlan when admin updates RoomType.basePrice. */
  async syncBasePlanFromRoomType(roomTypeId: string): Promise<void> {
    try {
      const roomType = await ratesRepository.findRoomType(roomTypeId);
      if (!roomType) return;
      const policy = await ratesRepository.ensureDefaultCancellationPolicies();
      await ratesRepository.upsertBasePlanFromRoomType(
        roomType,
        policy?.id ?? null,
      );
    } catch (err) {
      console.error("[rates] syncBasePlanFromRoomType", err);
    }
  }
}

export const ratesService = new RatesService();
