const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in kilometres.
 * Pure; no I/O. Alias: {@link haversineKm}.
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Alias of {@link haversine} (historical name). */
export const haversineKm = haversine;

/** Rough travel minutes between two points (~20 km/h effective). */
export function travelMinutesBetween(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
): number {
  if (
    a.lat == null ||
    a.lng == null ||
    b.lat == null ||
    b.lng == null ||
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return 20;
  }
  const km = haversine(a.lat, a.lng, b.lat, b.lng);
  return Math.max(10, Math.min(90, Math.round((km / 20) * 60)));
}
