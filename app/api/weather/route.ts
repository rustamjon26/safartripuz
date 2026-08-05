import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveDestinationCenter } from "@/lib/trip-builder/destinationCenters";
import {
  fallbackWeatherAdvice,
  openWeatherResponseSchema,
  toWeatherAdvice,
} from "@/lib/weather/openWeather";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  dest: z.string().trim().min(1).max(80),
});

const owErrorSchema = z.object({
  cod: z.union([z.number(), z.string()]).optional(),
  message: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ dest: url.searchParams.get("dest") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ message: "dest majburiy" }, { status: 400 });
  }

  const destination = parsed.data.dest;
  const [lat, lon] = resolveDestinationCenter(destination);
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();

  if (!apiKey) {
    const advice = fallbackWeatherAdvice(destination);
    return NextResponse.json(
      {
        live: false,
        reason: "OPENWEATHER_API_KEY sozlanmagan",
        lat,
        lon,
        advice,
      },
      { status: 200 },
    );
  }

  try {
    const owUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
    owUrl.searchParams.set("lat", String(lat));
    owUrl.searchParams.set("lon", String(lon));
    owUrl.searchParams.set("appid", apiKey);
    owUrl.searchParams.set("units", "metric");
    owUrl.searchParams.set("lang", "uz");

    const res = await fetch(owUrl.toString(), {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const json: unknown = await res.json();

    if (!res.ok) {
      const err = owErrorSchema.safeParse(json);
      console.error("[weather] OpenWeather error", res.status, err.success ? err.data : json);
      return NextResponse.json(
        {
          live: false,
          reason: err.success
            ? err.data.message ?? `OpenWeather ${res.status}`
            : `OpenWeather ${res.status}`,
          lat,
          lon,
          advice: fallbackWeatherAdvice(destination),
        },
        { status: 200 },
      );
    }

    const ow = openWeatherResponseSchema.safeParse(json);
    if (!ow.success) {
      console.error("[weather] unexpected payload", ow.error.flatten());
      return NextResponse.json(
        {
          live: false,
          reason: "OpenWeather javobi noto‘g‘ri",
          lat,
          lon,
          advice: fallbackWeatherAdvice(destination),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        live: true,
        lat,
        lon,
        advice: toWeatherAdvice(ow.data, destination),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    console.error("[weather] fetch failed", e);
    return NextResponse.json(
      {
        live: false,
        reason: "Ob-havo tarmoq xatosi",
        lat,
        lon,
        advice: fallbackWeatherAdvice(destination),
      },
      { status: 200 },
    );
  }
}
