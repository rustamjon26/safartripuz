export type GeocodeHit = {
  lat: number;
  lng: number;
  label: string;
};

/**
 * Resolve a free-text address via the app geocode proxy (OSM Nominatim).
 * Throws a user-facing Error when nothing usable is found.
 */
export async function geocodeAddress(query: string): Promise<GeocodeHit> {
  const q = query.trim();
  if (q.length < 2) {
    throw new Error("Manzil juda qisqa");
  }

  const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
    credentials: "include",
  });
  const data = (await res.json()) as {
    results?: Array<{ lat: number; lon: number; label: string }>;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || "Manzil topilmadi");
  }
  const hit = data.results?.[0];
  if (
    !hit ||
    !Number.isFinite(hit.lat) ||
    !Number.isFinite(hit.lon)
  ) {
    throw new Error(`Manzil topilmadi: "${q}"`);
  }
  return { lat: hit.lat, lng: hit.lon, label: hit.label };
}
