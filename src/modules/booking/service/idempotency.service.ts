import type { Prisma } from "@prisma/client";
import { decideIdempotency, readIdempotencyKey } from "../domain/idempotency";
import { bookingRepository } from "../repository/booking.repository";

function jsonBody(body: unknown): Prisma.InputJsonValue | null {
  const serialized: unknown = JSON.parse(JSON.stringify(body));
  if (serialized === null) return null;
  if (typeof serialized === "object") return serialized as Prisma.InputJsonValue;
  return null;
}

export { readIdempotencyKey };

export type IdempotencyGate =
  | { kind: "proceed" }
  | { kind: "replay"; statusCode: number; body: unknown }
  | { kind: "busy" };

/**
 * Claim a create key before the booking write. A second request with the same
 * key replays the stored response, or gets `busy` while the first is in flight.
 */
export async function beginBookingIdempotency(
  scope: string,
  actorId: string,
  key: string,
): Promise<IdempotencyGate> {
  const existing = await bookingRepository.findIdempotencyKey(scope, actorId, key);
  const decision = decideIdempotency(
    existing
      ? {
          statusCode: existing.statusCode,
          responseJson: existing.responseJson,
          createdAt: existing.createdAt,
        }
      : null,
    Date.now(),
  );

  if (decision.kind === "replay") {
    return { kind: "replay", statusCode: decision.statusCode, body: decision.body };
  }
  if (decision.kind === "busy") return { kind: "busy" };
  if (decision.kind === "reclaim") {
    await bookingRepository.deleteIdempotencyKey(scope, actorId, key);
  }

  const inserted = await bookingRepository.insertIdempotencyKey(scope, actorId, key);
  if (inserted) return { kind: "proceed" };

  const raced = await bookingRepository.findIdempotencyKey(scope, actorId, key);
  if (raced?.statusCode != null && raced.responseJson != null) {
    return { kind: "replay", statusCode: raced.statusCode, body: raced.responseJson };
  }
  return { kind: "busy" };
}

export async function completeBookingIdempotency(
  scope: string,
  actorId: string,
  key: string,
  statusCode: number,
  body: unknown,
): Promise<void> {
  try {
    const responseJson = jsonBody(body);
    if (responseJson == null) return;
    await bookingRepository.completeIdempotencyKey(
      scope,
      actorId,
      key,
      statusCode,
      responseJson,
    );
  } catch (err) {
    console.error("[idempotency] failed to store replay body", {
      scope,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function abandonBookingIdempotency(
  scope: string,
  actorId: string,
  key: string,
): Promise<void> {
  try {
    await bookingRepository.deleteIdempotencyKey(scope, actorId, key);
  } catch (err) {
    console.error("[idempotency] failed to release key", {
      scope,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
