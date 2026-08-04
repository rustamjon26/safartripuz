import type { FeedbackChannel, FeedbackSentiment } from "./types";

/** UZ tourism market baseline scores (0–100). Documented as reference, not live OTA scrape. */
export const UZ_MARKET_BASELINE: Record<FeedbackChannel | "all", number> = {
  hotel: 78,
  guide: 80,
  taxi: 76,
  homestay: 77,
  direct: 75,
  all: 79,
};

export const CHANNEL_LABELS: Record<FeedbackChannel | "all", string> = {
  hotel: "Mehmonxona",
  guide: "Gid",
  taxi: "Taxi",
  homestay: "Uy mehmonxona",
  direct: "To‘g‘ridan-to‘g‘ri",
  all: "Umumiy",
};

const STOPWORDS = new Set(
  [
    "va",
    "ham",
    "bu",
    "shu",
    "uchun",
    "bilan",
    "edi",
    "edi.",
    "juda",
    "yaxshi",
    "yomon",
    "lekin",
    "kerak",
    "bo'ldi",
    "boldi",
    "the",
    "and",
    "for",
    "was",
    "with",
    "that",
    "this",
    "a",
    "an",
    "of",
    "to",
    "in",
    "on",
    "is",
    "it",
    "we",
    "i",
    "my",
    "our",
    "not",
    "no",
    "yes",
    "ta",
    "da",
    "hamda",
  ].map((s) => s.toLowerCase()),
);

/** 1–5 star rating → 0–100 display score. */
export function ratingToScore(avgRating: number): number {
  if (!Number.isFinite(avgRating) || avgRating <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(avgRating * 20)));
}

export function tokenizeFeedbackBody(body: string): string[] {
  return body
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function topKeywords(
  bodies: string[],
  limit = 12,
): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const body of bodies) {
    const seen = new Set<string>();
    for (const token of tokenizeFeedbackBody(body)) {
      if (seen.has(token)) continue;
      seen.add(token);
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

export type ImprovementPriority = "high" | "mid" | "low";

export function priorityFromCount(count: number): ImprovementPriority {
  if (count >= 10) return "high";
  if (count >= 4) return "mid";
  return "low";
}

export function improvementStatus(priority: ImprovementPriority): string {
  if (priority === "high") return "Diqqat";
  if (priority === "mid") return "Kuzatuv";
  return "Past";
}

export type ChannelRatingRow = {
  channel: FeedbackChannel;
  avgRating: number;
  count: number;
};

export type MarketCompareRow = {
  label: string;
  key: FeedbackChannel | "all";
  brand: number;
  market: number;
  sampleSize: number;
};

export function buildMarketCompare(
  rows: ChannelRatingRow[],
  overallAvg: number,
  overallCount: number,
): MarketCompareRow[] {
  const byChannel = new Map(rows.map((r) => [r.channel, r]));
  const channels: FeedbackChannel[] = [
    "hotel",
    "guide",
    "taxi",
    "homestay",
    "direct",
  ];

  const compare: MarketCompareRow[] = channels.map((ch) => {
    const row = byChannel.get(ch);
    const count = row?.count ?? 0;
    const avg = row?.avgRating ?? 0;
    return {
      label: CHANNEL_LABELS[ch],
      key: ch,
      brand: count > 0 ? ratingToScore(avg) : 0,
      market: UZ_MARKET_BASELINE[ch],
      sampleSize: count,
    };
  });

  compare.unshift({
    label: CHANNEL_LABELS.all,
    key: "all",
    brand: overallCount > 0 ? ratingToScore(overallAvg) : 0,
    market: UZ_MARKET_BASELINE.all,
    sampleSize: overallCount,
  });

  return compare;
}

export type NegativeGroupInput = {
  key: string;
  label: string;
  count: number;
  sampleBody: string | null;
};

export function buildImprovements(
  groups: NegativeGroupInput[],
  limit = 4,
): Array<{
  id: string;
  area: string;
  description: string;
  count: number;
  priority: ImprovementPriority;
  status: string;
}> {
  return [...groups]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => {
      const priority = priorityFromCount(g.count);
      const snippet = g.sampleBody?.trim();
      return {
        id: g.key,
        area: g.label,
        description: snippet
          ? snippet.length > 140
            ? `${snippet.slice(0, 137)}…`
            : snippet
          : `${g.count} ta salbiy fikr — tekshirish tavsiya etiladi.`,
        count: g.count,
        priority,
        status: improvementStatus(priority),
      };
    });
}

export function sentimentBodiesSplit(
  tickets: Array<{ body: string; sentiment: FeedbackSentiment }>,
): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  for (const t of tickets) {
    if (t.sentiment === "POSITIVE") positive.push(t.body);
    if (t.sentiment === "NEGATIVE") negative.push(t.body);
  }
  return { positive, negative };
}
