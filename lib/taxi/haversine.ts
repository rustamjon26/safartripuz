const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
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

export const haversineDistanceKm = haversineDistance;

/*
Unit test examples:
1) haversineDistance(41.3111, 69.2797, 41.3111, 69.2797) ~= 0.00 km
2) haversineDistance(41.3111, 69.2797, 41.2995, 69.2401) ~= 3.52 km
3) haversineDistance(40.3777, 71.7890, 39.6542, 66.9597) ~= 418.70 km
*/
