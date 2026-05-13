import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to OpenStreetMap Nominatim (avoids browser CORS + sets UA).
 * Use for address / town search in LocationPicker (e.g. "Zomin, Jizzakh").
 *
 * Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */
export const dynamic = "force-dynamic";

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] as { lat: number; lon: number; label: string }[] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "uz");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "uz,en",
        // Required by Nominatim for identifiable traffic
        "User-Agent": "SafarTrip/1.0 (https://safartrip.uz; geocode for property location)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Geokodlashtirish xizmati vaqtincha ishlamayapti" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as NominatimItem[];
    const results = data.map((item) => ({
      lat: Number(item.lat),
      lon: Number(item.lon),
      label: item.display_name,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ message: "Tarmoq xatosi" }, { status: 500 });
  }
}
