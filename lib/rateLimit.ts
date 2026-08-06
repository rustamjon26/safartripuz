import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Fixed-window rate limiting backed by the database.
 *
 * In-process counters gave every PM2 process its own budget and reset on each
 * deploy, so the limit was worth roughly nothing. The counter now lives in one
 * table that all processes share.
 *
 * Concurrency uses the same shape as hold expiry: a conditional UPDATE whose
 * affected-row count is the answer. `count < max` is evaluated by MySQL while
 * the row is locked, so parallel callers can never push it past the limit.
 */

/** Window boundaries are computed from epoch, so all processes agree. */
export function windowStartFor(now: number, windowMs: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/** Sweep old rows now and then rather than adding another cron. */
const CLEANUP_PROBABILITY = 0.01;

async function cleanupExpired(now: Date): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  } catch {
    // Housekeeping must never fail a request.
  }
}

/**
 * Returns true when the caller is still within budget.
 *
 * Fails open: if the database is unreachable the request proceeds, because the
 * endpoints behind this (login, register) cannot do anything without the
 * database anyway — refusing here would only turn an outage into a lockout.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000,
): Promise<boolean> {
  const nowMs = Date.now();
  const windowStart = windowStartFor(nowMs, windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  try {
    // Create the window row if this is the first caller. INSERT IGNORE keeps
    // the race between two first-callers harmless.
    await prisma.$executeRawUnsafe(
      `INSERT IGNORE INTO RateLimit (id, bucketKey, windowStart, count, expiresAt, createdAt)
       VALUES (?, ?, ?, 0, ?, NOW(3))`,
      randomUUID(),
      key,
      windowStart,
      expiresAt,
    );

    // Atomic claim: one row updated means this attempt fit under the limit.
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE RateLimit
       SET count = count + 1
       WHERE bucketKey = ? AND windowStart = ? AND count < ?`,
      key,
      windowStart,
      maxAttempts,
    );

    if (Math.random() < CLEANUP_PROBABILITY) {
      await cleanupExpired(new Date(nowMs));
    }

    return Number(updated) === 1;
  } catch (err) {
    console.error("[rateLimit] store unavailable, allowing request", {
      key,
      err: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}

/** Current usage for a bucket — diagnostics and tests. */
export async function rateLimitCount(
  key: string,
  windowMs = 60_000,
  now = Date.now(),
): Promise<number> {
  const row = await prisma.rateLimit.findUnique({
    where: {
      bucketKey_windowStart: {
        bucketKey: key,
        windowStart: windowStartFor(now, windowMs),
      },
    },
    select: { count: true },
  });
  return row?.count ?? 0;
}
