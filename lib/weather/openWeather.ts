import { z } from "zod";

export const openWeatherResponseSchema = z.object({
  weather: z
    .array(
      z.object({
        id: z.number().optional(),
        main: z.string(),
        description: z.string(),
        icon: z.string().optional(),
      }),
    )
    .min(1),
  main: z.object({
    temp: z.number(),
    feels_like: z.number().optional(),
    humidity: z.number().optional(),
  }),
  wind: z
    .object({
      speed: z.number().optional(),
    })
    .optional(),
  name: z.string().optional(),
});

export type OpenWeatherPayload = z.infer<typeof openWeatherResponseSchema>;

export type WeatherAdviceKind = "sun" | "wind" | "rain" | "cloud" | "snow";

export type WeatherAdvice = {
  tempC: number;
  tempLabel: string;
  description: string;
  tip: string;
  kind: WeatherAdviceKind;
  fetchedAt: string;
};

export function formatTempLabel(tempC: number): string {
  const rounded = Math.round(tempC);
  return `${rounded >= 0 ? "+" : ""}${rounded}°C`;
}

export function weatherKindFromMain(main: string): WeatherAdviceKind {
  const m = main.toLowerCase();
  if (m.includes("thunder") || m.includes("rain") || m.includes("drizzle")) {
    return "rain";
  }
  if (m.includes("snow")) return "snow";
  if (m.includes("clear")) return "sun";
  if (m.includes("cloud")) return "cloud";
  if (
    m.includes("wind") ||
    m.includes("squall") ||
    m.includes("tornado") ||
    m.includes("mist") ||
    m.includes("fog") ||
    m.includes("haze") ||
    m.includes("dust") ||
    m.includes("sand") ||
    m.includes("smoke") ||
    m.includes("ash")
  ) {
    return "wind";
  }
  return "cloud";
}

/** Uzbek travel tip from live conditions + destination label. */
export function buildWeatherTip(input: {
  destination: string;
  tempC: number;
  main: string;
  description: string;
}): string {
  const place = input.destination.trim() || "Manzil";
  const desc = input.description.trim();
  const t = input.tempC;
  const main = input.main.toLowerCase();

  if (main.includes("thunder")) {
    return `${place}: momaqaldiroq xavfi. ${desc}. Imkon bo‘lsa ochiq maydonda qolmang, yomg‘ir kiyimini oling.`;
  }
  if (main.includes("rain") || main.includes("drizzle")) {
    return `${place}: ${desc}. Soyabon yoki yomg‘irparda oling, kayfiyatli sayohat uchun yopiq joylarni rejalashtiring.`;
  }
  if (main.includes("snow")) {
    return `${place}: ${desc} (${formatTempLabel(t)}). Issiq kiyim, sirpanchiq yo‘llarga ehtiyot bo‘ling.`;
  }
  if (t <= 5) {
    return `${place}: hozir ${formatTempLabel(t)}, ${desc}. Issiqroq kiyim va qo‘lqop oling.`;
  }
  if (t <= 15) {
    return `${place}: ${formatTempLabel(t)}, ${desc}. Yengil kurtka yoki longsleeve qulay bo‘ladi.`;
  }
  if (t >= 32) {
    return `${place}: issiq — ${formatTempLabel(t)}, ${desc}. Bosh kiyim, krem va ko‘proq suv oling.`;
  }
  if (t >= 25) {
    return `${place}: ${formatTempLabel(t)}, ${desc}. Yengil kiyim va suv zaxirasi tavsiya etiladi.`;
  }
  return `${place}: ${formatTempLabel(t)}, ${desc}. Sayohat uchun qulay havo.`;
}

export function toWeatherAdvice(
  payload: OpenWeatherPayload,
  destination: string,
): WeatherAdvice {
  const w0 = payload.weather[0];
  const tempC = payload.main.temp;
  const main = w0.main;
  const description = w0.description;
  return {
    tempC,
    tempLabel: formatTempLabel(tempC),
    description,
    tip: buildWeatherTip({ destination, tempC, main, description }),
    kind: weatherKindFromMain(main),
    fetchedAt: new Date().toISOString(),
  };
}

/** Static fallback when API key missing / OpenWeather fails. */
export function fallbackWeatherAdvice(destination: string): WeatherAdvice {
  const dest = destination.toLowerCase();
  if (dest.includes("zomin") || dest.includes("zaamin") || dest.includes("tog")) {
    return {
      tempC: 12,
      tempLabel: "+12°C",
      description: "taxminiy",
      tip: `Tog'li muhit. ${destination} qishda sovuq, yozda salqin bo‘ladi. Issiqroq kiyim olishni unutmang. (Jonli ob-havo vaqtincha mavjud emas)`,
      kind: "wind",
      fetchedAt: new Date().toISOString(),
    };
  }
  if (
    dest.includes("samarqand") ||
    dest.includes("samarkand") ||
    dest.includes("buxoro") ||
    dest.includes("bukhara") ||
    dest.includes("xiva") ||
    dest.includes("khiva")
  ) {
    return {
      tempC: 28,
      tempLabel: "+28°C",
      description: "taxminiy",
      tip: "Havo quruq va issiq bo‘lishi mumkin. Qulay yozgi kiyim, bosh kiyim va suv oling. (Jonli ob-havo vaqtincha mavjud emas)",
      kind: "sun",
      fetchedAt: new Date().toISOString(),
    };
  }
  return {
    tempC: 20,
    tempLabel: "+20°C",
    description: "taxminiy",
    tip: "O‘zgaruvchan havo kutilmoqda. Safar sanasida ob-havoni tekshiring. (Jonli ob-havo vaqtincha mavjud emas)",
    kind: "rain",
    fetchedAt: new Date().toISOString(),
  };
}
