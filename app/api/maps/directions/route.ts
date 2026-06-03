import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(
  originLat: string,
  originLng: string,
  destLat: string,
  destLng: string,
): string {
  const round = (v: string) => Math.round(parseFloat(v) * 10000) / 10000;
  return `${round(originLat)},${round(originLng)}_${round(destLat)},${round(destLng)}`;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}, 10 * 60 * 1000);

type GoogleDirectionsResponse = {
  status: string;
  routes?: Array<{
    summary?: string;
    overview_polyline: { points: string };
    legs?: Array<{
      distance?: { text: string; value: number };
      duration?: { text: string; value: number };
    }>;
  }>;
};

export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const { searchParams } = new URL(req.url);
    const originLat = searchParams.get("originLat");
    const originLng = searchParams.get("originLng");
    const destLat = searchParams.get("destLat");
    const destLng = searchParams.get("destLng");

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Maps not configured" }, { status: 503 });
    }

    const cacheKey = getCacheKey(originLat, originLng, destLat, destLng);
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destLat},${destLng}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("language", "uz");
    url.searchParams.set("region", "uz");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = (await response.json()) as GoogleDirectionsResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: "Directions unavailable", status: data.status },
        { status: 502 },
      );
    }

    const route = data.routes?.[0];
    let responseData: {
      polyline: Array<{ lat: number; lng: number }>;
      distance: { text: string; value: number } | null;
      duration: { text: string; value: number } | null;
      summary?: string;
    };

    if (!route) {
      responseData = { polyline: [], distance: null, duration: null };
    } else {
      const leg = route.legs?.[0];
      responseData = {
        polyline: decodePolyline(route.overview_polyline.points),
        distance: leg?.distance ?? null,
        duration: leg?.duration ?? null,
        summary: route.summary ?? "",
      };
    }

    cache.set(cacheKey, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(responseData);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
