import { z } from "zod";
import { normalizeRegion } from "./normalize";

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
  message: z.string().trim().optional().default(""),
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
  "Qaysi shaharga boramiz? Samarqand, Buxoro yoki Xiva deb yozing — men mehmonxona, transfer va gidni yig'aman.";

export function guestFacingMessage(raw: string, destination: string): string {
  const text = raw.trim();
  if (!text || ERRORISH_MESSAGE.test(text)) {
    return destination ? `${destination} bo'yicha safar yig'ildi.` : CITY_CLARIFY_MESSAGE;
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
  const byExact = (name: string): string => {
    const n = name.trim().toLowerCase();
    if (!n) return "";
    return availableCities.find((c) => c.trim().toLowerCase() === n) ?? "";
  };

  const fromExact = byExact(candidate);
  if (fromExact) return fromExact;

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

  return {
    ...base,
    destination,
    message: guestFacingMessage(base.message, destination),
  };
}

export function buildAiMatchPrompt(
  userPrompt: string,
  availableCities: string[],
): string {
  const cities =
    availableCities.length > 0 ? availableCities.join(", ") : "(ro'yxat bo'sh)";
  return [
    "Siz O'zbekiston bo'ylab sayohat rejalashtiruvchi yordamchisiz.",
    `Foydalanuvchi so'rovi: "${userPrompt.replace(/"/g, "'")}"`,
    `Mavjud shaharlar ro'yxati: ${cities}`,
    "MUHIM: destination FAQAT yuqoridagi ro'yxatdan bo'lishi kerak.",
    "Faqat shu JSON ni qaytar, boshqa hech narsa yozma:",
    '{"destination":"shahar_nomi","pax":2,"budget":"cheap|expensive|any","days":2,"mood":"romantic|family|adventure|relax|business|any","message":"o\'zbek tilida 1 jumlali javob"}',
  ].join("\n");
}
