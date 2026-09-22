import { z } from "zod";

/** Incomplete claims older than this can be retried. */
export const IDEMPOTENCY_STALE_MS = 60_000;

const keySchema = z.string().trim().min(8).max(128).regex(/^[\w.-]+$/);

export function readIdempotencyKey(header: string | null): string | null {
  const parsed = keySchema.safeParse(header ?? "");
  return parsed.success ? parsed.data : null;
}

export type IdempotencyRow = {
  statusCode: number | null;
  responseJson: unknown;
  createdAt: Date;
};

export type IdempotencyDecision =
  | { kind: "fresh" }
  | { kind: "replay"; statusCode: number; body: unknown }
  | { kind: "busy" }
  | { kind: "reclaim" };

export function decideIdempotency(
  row: IdempotencyRow | null,
  nowMs: number,
): IdempotencyDecision {
  if (!row) return { kind: "fresh" };
  if (row.statusCode != null && row.responseJson != null) {
    return { kind: "replay", statusCode: row.statusCode, body: row.responseJson };
  }
  if (nowMs - row.createdAt.getTime() < IDEMPOTENCY_STALE_MS) {
    return { kind: "busy" };
  }
  return { kind: "reclaim" };
}
