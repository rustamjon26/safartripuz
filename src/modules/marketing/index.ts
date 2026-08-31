export { marketingService, MarketingService } from "./service/marketing.service";
export {
  bpsToPercent,
  countLivePromos,
  isPromoLive,
  normalizePromoCode,
  percentToBps,
  PromoCodeTakenError,
  PromoNotFoundError,
  MAX_DISCOUNT_PERCENT,
} from "./domain/promo";
export type { HotelPromoType, HotelPromoView } from "./domain/promo";
export {
  createHotelPromoSchema,
  patchHotelPromoSchema,
  hotelPromoTypeSchema,
} from "./domain/validate";
export type {
  CreateHotelPromoInput,
  PatchHotelPromoInput,
} from "./domain/validate";
