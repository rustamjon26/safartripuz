import { z } from "zod";
import { normalizeRegion } from "./normalize";
import {
  geographyBrainForPrompt,
  isAmbiguousDestinationPrompt,
  isBroadHistoryTheme,
  matchLocalPlace,
  matchPlaceCity,
  matchRoute,
  matchTheme,
  matchUzUnit,
  namedCatalogCity,
} from "./uzbekistanPlaces";

export type AiMatchBudget = "cheap" | "expensive" | "any";
export type AiMatchMood =
  | "romantic"
  | "family"
  | "adventure"
  | "relax"
  | "business"
  | "any";

export type AiMatchIntent = {
  destination: string;
  pax: number;
  budget: AiMatchBudget;
  days: number;
  mood: AiMatchMood;
  message: string;
};

const budgetSchema = z.preprocess((v) => {
  if (typeof v !== "string") return "any";
  const s = v.trim().toLowerCase();
  if (s === "cheap" || s === "expensive") return s;
  return "any";
}, z.enum(["cheap", "expensive", "any"]));

const moodSchema = z.preprocess((v) => {
  if (typeof v !== "string") return "any";
  const s = v.trim().toLowerCase();
  if (
    s === "romantic" ||
    s === "family" ||
    s === "adventure" ||
    s === "relax" ||
    s === "business"
  ) {
    return s;
  }
  return "any";
}, z.enum(["romantic", "family", "adventure", "relax", "business", "any"]));

export const aiMatchLlmSchema = z.object({
  destination: z.string().trim().optional().default(""),
  pax: z.coerce.number().int().min(1).max(20).optional().default(2),
  budget: budgetSchema,
  days: z.coerce.number().int().min(1).max(14).optional().default(2),
  mood: moodSchema,
  message: z.string().trim().max(1500).optional().default(""),
});

const EMPTY_INTENT: AiMatchIntent = {
  destination: "",
  pax: 2,
  budget: "any",
  days: 2,
  mood: "any",
  message: "",
};

const ERRORISH_MESSAGE =
  /api\s*xato|^xato$|internal server|unauthorized|not configured|llm returned/i;

export const CITY_CLARIFY_MESSAGE =
  "Qayerga ketamiz, do'stim? Viloyat, tuman yoki shahar ayt — Urgut, Xiva, Zomin, Farg'ona, Samarqand… birga yo'l tuzamiz.";

export function guestFacingMessage(
  raw: string,
  destination: string,
  userPrompt = "",
): string {
  const text = raw.trim();
  if (!text || ERRORISH_MESSAGE.test(text)) {
    if (destination) return `${destination} bo'yicha safar yig'ildi.`;
    if (userPrompt && isBroadHistoryTheme(userPrompt)) {
      return "Ipak yo'li — Samarqand, Buxoro, Xiva. Qaysi shahardan boshlaymiz, do'stim?";
    }
    return CITY_CLARIFY_MESSAGE;
  }
  return text;
}

export function extractJsonObject(raw: string): string | null {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return cleaned;
  } catch {
    // fall through to brace match
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

export function resolveDestination(
  candidate: string,
  availableCities: string[],
  userPrompt: string,
): string {
  if (isAmbiguousDestinationPrompt(userPrompt, availableCities)) {
    return namedCatalogCity(userPrompt, availableCities);
  }

  const byExact = (name: string): string => {
    const n = name.trim().toLowerCase();
    if (!n) return "";
    return availableCities.find((c) => c.trim().toLowerCase() === n) ?? "";
  };

  const fromExact = byExact(candidate);
  if (fromExact) return fromExact;

  const fromPlaceCandidate = namedCatalogCity(candidate, availableCities);
  if (fromPlaceCandidate) return fromPlaceCandidate;

  const fromPlacePrompt = namedCatalogCity(userPrompt, availableCities);
  if (fromPlacePrompt) return fromPlacePrompt;

  const candidateCode = candidate.trim()
    ? normalizeRegion(candidate).regionCode
    : "";
  if (candidateCode && candidateCode !== "unknown") {
    const fromCode = availableCities.find(
      (c) => normalizeRegion(c).regionCode === candidateCode,
    );
    if (fromCode) return fromCode;
  }

  const prompt = userPrompt.toLowerCase();
  for (const city of availableCities) {
    const c = city.trim();
    if (c.length >= 3 && prompt.includes(c.toLowerCase())) return city;
  }
  return "";
}

export function parseAiMatchIntent(
  rawText: string,
  availableCities: string[],
  userPrompt: string,
): AiMatchIntent {
  const jsonText = extractJsonObject(rawText);
  let base: AiMatchIntent = EMPTY_INTENT;
  if (jsonText) {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      const result = aiMatchLlmSchema.safeParse(parsed);
      if (result.success) {
        base = {
          destination: result.data.destination,
          pax: result.data.pax,
          budget: result.data.budget,
          days: result.data.days,
          mood: result.data.mood,
          message: result.data.message,
        };
      }
    } catch {
      // keep defaults, still try city from the user prompt
    }
  }

  const destination = resolveDestination(
    base.destination,
    availableCities,
    userPrompt,
  );
  const route = matchRoute(userPrompt);
  const theme = matchTheme(userPrompt);
  const usedLlmJson = jsonText !== null;
  const days = !usedLlmJson && route ? route.days : base.days;
  const mood = !usedLlmJson && theme ? theme.mood : base.mood;

  return {
    ...base,
    destination,
    days,
    mood,
    message: guestFacingMessage(
      base.message || fallbackFriendMessage(userPrompt, availableCities, destination),
      destination,
      userPrompt,
    ),
  };
}

export type AiMatchChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function fallbackFriendMessage(
  userPrompt: string,
  availableCities: string[],
  destination: string,
): string {
  const local = matchLocalPlace(userPrompt);
  if (local) {
    return destination
      ? local.guest_blurb_uz
      : `${local.guest_blurb_uz} ${local.why_nearest}`;
  }
  if (destination) return "";
  const unit = matchUzUnit(userPrompt);
  if (unit) {
    return `${unit.guest_blurb_uz} Hozir katalogda shu yo'nalishda mehmonxona yo'q. Yaqinroq ${unit.nearest_hub} dan boshlaylikmi?`;
  }
  const route = matchRoute(userPrompt);
  if (route) return route.guest_blurb_uz;
  const theme = matchTheme(userPrompt);
  if (theme) return theme.guest_blurb_uz;
  const known = matchPlaceCity(userPrompt);
  if (known) {
    const nearby = availableCities.slice(0, 5).join(", ");
    return `${known}ni yaxshi bilaman — go'zal joy. Hozir katalogimizda shu yo'nalishda mehmonxona yo'q. Yaqinroq ${nearby} dan birini tanlaymizmi?`;
  }
  return "";
}

export function buildAiMatchPrompt(
  userPrompt: string,
  availableCities: string[],
  history: AiMatchChatTurn[] = [],
): string {
  const cities =
    availableCities.length > 0 ? availableCities.join(", ") : "(ro'yxat bo'sh)";
  const hist = history
    .slice(-8)
    .map((t) => {
      const who = t.role === "user" ? "Mijoz" : "Sen";
      return `${who}: ${t.content.slice(0, 1200)}`;
    })
    .join("\n");
  return [
    "Sen SafarTrip AI — O'zbekistonda sayohat qilayotgan do'stsan, quruq bot emassan.",
    "O'zbekcha, samimiy, 2–4 jumla. Hech qachon «API xato» yozma. Mehmonxona yoki narx o'ylab topma.",
    geographyBrainForPrompt(availableCities),
    `Katalogdagi mehmonxona shaharlari (destination FAQAT shulardan yoki bo'sh satr): ${cities}`,
    "Agar tuman/viloyatni tansang-u katalogda shahar yo'q bo'lsa: joyni 1 jumlada maqta, destination ni BO'SH qoldir, yaqin katalog shahrini so'ra.",
    "«Tarixiy shaharlar» / ipak yo'li: Samarqand, Buxoro yoki Xiva ni foydalanuvchi aytmaguncha destination bo'sh, so'ra.",
    hist ? `OLDINGI SUHBAT (davom ettir, takrorlama):\n${hist}` : "",
    `HOZIRGI XABAR: "${userPrompt.replace(/"/g, "'")}"`,
    "Javob oxirida albatta shu JSON (oldin do'stona matn bo'lishi mumkin):",
    '{"destination":"","pax":2,"budget":"cheap|expensive|any","days":2,"mood":"romantic|family|adventure|relax|business|any","message":"do\'stona o\'zbekcha 2-4 jumla"}',
  ]
    .filter(Boolean)
    .join("\n");
}
