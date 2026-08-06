import { isUniqueConstraintViolation } from "@/lib/prismaErrors";
import {
  countLivePromos,
  type HotelPromoView,
  normalizePromoCode,
  percentToBps,
  PromoCodeTakenError,
  PromoNotFoundError,
} from "../domain/promo";
import type { CreateHotelPromoInput, PatchHotelPromoInput } from "../domain/validate";
import { marketingRepository } from "../repository/marketing.repository";

export class MarketingService {
  async listPromos(hotelId: string): Promise<{
    promos: HotelPromoView[];
    activeCount: number;
  }> {
    const promos = await marketingRepository.listPromos(hotelId);
    return { promos, activeCount: countLivePromos(promos) };
  }

  async createPromo(
    hotelId: string,
    input: CreateHotelPromoInput,
  ): Promise<HotelPromoView> {
    const code = normalizePromoCode(input.code);
    try {
      return await marketingRepository.createPromo({
        hotelId,
        title: input.title,
        code,
        discountBps: percentToBps(input.discountPercent),
        type: input.type,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      });
    } catch (err) {
      // @@unique([hotelId, code]) — surfaced as 409 rather than a 500.
      if (code && isUniqueConstraintViolation(err)) {
        throw new PromoCodeTakenError(code);
      }
      throw err;
    }
  }

  async patchPromo(
    hotelId: string,
    id: string,
    patch: PatchHotelPromoInput,
  ): Promise<HotelPromoView> {
    const updated = await marketingRepository.updatePromo(id, hotelId, patch);
    if (!updated) throw new PromoNotFoundError();
    return updated;
  }

  async deletePromo(hotelId: string, id: string): Promise<void> {
    const deleted = await marketingRepository.deletePromo(id, hotelId);
    if (!deleted) throw new PromoNotFoundError();
  }
}

export const marketingService = new MarketingService();
