export type HotelPromoType = "SEASONAL" | "EVENT" | "LOYALTY";

export type HotelPromoView = {
  id: string;
  hotelId: string;
  title: string;
  code: string | null;
  /** Basis points; the UI shows `discountPercent`. */
  discountBps: number;
  discountPercent: number;
  type: HotelPromoType;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export const MAX_DISCOUNT_PERCENT = 100;

/**
 * Percent → basis points. Percentages are stored as integers so a promo can
 * never carry a float (same reason `Promotion` uses PERCENT_BPS).
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function bpsToPercent(bps: number): number {
  return Math.round(bps) / 100;
}

/** Codes are compared case-insensitively, so they are stored uppercased. */
export function normalizePromoCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

/**
 * A promo counts as active when the partner has it switched on and today falls
 * inside any configured window — an expired campaign must not inflate the count.
 */
export function isPromoLive(
  promo: Pick<HotelPromoView, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  if (!promo.isActive) return false;
  if (promo.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo.endsAt && new Date(promo.endsAt) < now) return false;
  return true;
}

export function countLivePromos(
  promos: Array<Pick<HotelPromoView, "isActive" | "startsAt" | "endsAt">>,
  now: Date = new Date(),
): number {
  return promos.filter((p) => isPromoLive(p, now)).length;
}

export class PromoCodeTakenError extends Error {
  constructor(code: string) {
    super(`Promo kodi allaqachon mavjud: ${code}`);
    this.name = "PromoCodeTakenError";
  }
}

export class PromoNotFoundError extends Error {
  constructor() {
    super("Promo topilmadi");
    this.name = "PromoNotFoundError";
  }
}
