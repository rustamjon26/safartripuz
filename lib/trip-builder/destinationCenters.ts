/** City centers for trip-builder preview (no Google key — OSM tiles). */
export const CITY_CENTERS: Record<string, [number, number]> = {
  samarqand: [39.6542, 66.9597],
  samarkand: [39.6542, 66.9597],
  buxoro: [39.7747, 64.4286],
  bukhara: [39.7747, 64.4286],
  xiva: [41.3775, 60.36],
  khiva: [41.3775, 60.36],
  toshkent: [41.3111, 69.2797],
  tashkent: [41.3111, 69.2797],
  jizzax: [40.1158, 67.8422],
  jizzakh: [40.1158, 67.8422],
  zomin: [39.9606, 68.3956],
  zaamin: [39.9606, 68.3956],
};

export const UZ_FALLBACK: [number, number] = [41.3, 64.5];

export function resolveDestinationCenter(
  destination: string | null | undefined,
): [number, number] {
  const key = (destination ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!key) return UZ_FALLBACK;
  if (CITY_CENTERS[key]) return CITY_CENTERS[key];
  for (const [name, center] of Object.entries(CITY_CENTERS)) {
    if (key.includes(name) || name.includes(key)) return center;
  }
  return UZ_FALLBACK;
}
