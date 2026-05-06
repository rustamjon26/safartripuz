/** Taxi service type / category → Uzbek label (covers Prisma `TaxiServiceType` + vehicle-style keys). */
export const TAXI_CATEGORY_LABELS: Record<string, string> = {
  CITY_TRANSFER: "Shahar ichi",
  HOTEL_TRANSFER: "Mehmonxona transferi",
  AIRPORT_TRANSFER: "Aeroport transferi",
  INTERCITY: "Shaharlararo",
  INTERCITY_TRANSFER: "Shaharlararo",
  STANDARD: "Standart",
  COMFORT: "Komfort",
  MINIVAN: "Miniven",
  PREMIUM: "Premium",
  TOUR_DAILY_TRANSPORT: "Kunlik tur transporti",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  UZ: "O'zbek tili",
  RU: "Rus tili",
  EN: "Ingliz tili",
  DE: "Nemis tili",
  FR: "Fransuz tili",
  ZH: "Xitoy tili",
  AR: "Arab tili",
  TR: "Turk tili",
};

/** Spaced integer (Uzbek-style thousands), e.g. `350000` → `"350 000"`. */
export function formatUzInteger(amount: number): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n)) return "0";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** e.g. `"3 500 so'm"` */
export function formatPrice(amount: number): string {
  return `${formatUzInteger(amount)} so'm`;
}

/** e.g. `"3 500 so'm/kecha"` */
export function formatPricePerUnit(
  amount: number,
  unit: "kecha" | "soat" | "km",
): string {
  return `${formatUzInteger(amount)} so'm/${unit}`;
}

export function taxiServiceTypeLabel(serviceType: string): string {
  const key = serviceType?.trim();
  if (!key) return "";
  return TAXI_CATEGORY_LABELS[key] ?? serviceType;
}

export function languageLabel(code: string): string {
  const key = code?.trim().toUpperCase();
  if (!key) return "";
  return LANGUAGE_LABELS[key] ?? code;
}

export const GUIDE_CATEGORY_LABELS: Record<string, string> = {
  CITY_TOUR: "Shahar turi",
  NATURE: "Tabiat",
  HISTORY: "Tarix",
  ADVENTURE: "Sarguzasht",
  FOOD: "Taomlar",
  CUSTOM: "Maxsus",
};

export function guideCategoryLabel(category: string): string {
  const key = category?.trim();
  if (!key) return "";
  return GUIDE_CATEGORY_LABELS[key] ?? category;
}
