import * as Location from "expo-location";

const FALLBACK_ADDRESS = "Mening joylashuvim";
const UZBEKISTAN_SUFFIX = ", O'zbekiston";

function joinParts(parts: (string | null | undefined)[], separator = ", "): string {
  return parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(separator);
}

function formatReverseAddress(result: Location.LocationGeocodedAddress): string | null {
  const streetLine = joinParts(
    [result.street, result.streetNumber].filter(Boolean),
    " ",
  );
  const districtOrCity = result.district?.trim() || result.city?.trim() || "";
  const city = result.city?.trim() || "";
  const region = result.region?.trim() || "";

  if (streetLine && districtOrCity) {
    return joinParts([streetLine, districtOrCity]);
  }

  const name = result.name?.trim();
  if (name && city) {
    return joinParts([name, city]);
  }

  if (city && region) {
    return joinParts([city, region]);
  }

  if (city) return city;
  if (region) return region;
  if (name) return name;

  return null;
}

function withUzbekistanContext(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("o'zbekiston") ||
    lower.includes("oʻzbekiston") ||
    lower.includes("uzbekistan") ||
    lower.includes("ўзбекистон")
  ) {
    return trimmed;
  }

  return `${trimmed}${UZBEKISTAN_SUFFIX}`;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    const first = results[0];
    if (!first) return FALLBACK_ADDRESS;

    const formatted = formatReverseAddress(first);
    return formatted ?? FALLBACK_ADDRESS;
  } catch {
    return FALLBACK_ADDRESS;
  }
}

export async function forwardGeocode(
  address: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const label = address.trim();
  if (!label) return null;

  try {
    const query = withUzbekistanContext(label);
    const results = await Location.geocodeAsync(query);
    const first = results[0];
    if (!first || first.latitude == null || first.longitude == null) {
      return null;
    }

    return {
      lat: first.latitude,
      lng: first.longitude,
      label,
    };
  } catch {
    return null;
  }
}
