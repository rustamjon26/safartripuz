import type { FeedbackSentiment } from "./types";

/** Pure rating → sentiment mapping (1–5). */
export function sentimentFromRating(rating: number): FeedbackSentiment {
  if (rating >= 4) return "POSITIVE";
  if (rating === 3) return "NEUTRAL";
  return "NEGATIVE";
}

/** 0–100 index: share of positive among scored tickets. */
export function sentimentIndex(counts: {
  positive: number;
  neutral: number;
  negative: number;
}): number {
  const total = counts.positive + counts.neutral + counts.negative;
  if (total <= 0) return 0;
  return Math.round((counts.positive / total) * 100);
}

export function responseRate(total: number, answeredLike: number): number {
  if (total <= 0) return 0;
  return Math.round((answeredLike / total) * 100);
}
