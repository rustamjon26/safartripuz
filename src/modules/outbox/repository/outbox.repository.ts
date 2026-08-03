import type { Prisma } from "@prisma/client";
import { db, type DbClient } from "@/src/shared/db/client";
import type { EnqueueEventInput } from "../domain/types";

export type OutboxEventRow = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  sentAt: Date | null;
  lastError: string | null;
};

const LEASE_MS = 30_000;

export class OutboxRepository {
  async enqueueInTx(tx: DbClient, event: EnqueueEventInput): Promise<OutboxEventRow> {
    const row = await tx.outboxEvent.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonValue,
        status: "PENDING",
        attempts: 0,
        availableAt: new Date(),
      },
    });
    return row as unknown as OutboxEventRow;
  }

  /**
   * Claim a batch with MySQL SKIP LOCKED + short lease on availableAt.
   */
  async claimBatch(limit: number, client: typeof db = db): Promise<OutboxEventRow[]> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    const n = Math.max(1, Math.min(100, limit));

    return client.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT id FROM OutboxEvent
         WHERE status = 'PENDING' AND availableAt <= ?
         ORDER BY createdAt ASC
         LIMIT ${n}
         FOR UPDATE SKIP LOCKED`,
        now,
      )) as Array<{ id: string }>;

      if (!rows.length) return [];

      const ids = rows.map((r) => r.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data: {
          attempts: { increment: 1 },
          availableAt: leaseUntil,
        },
      });

      const claimed = await tx.outboxEvent.findMany({
        where: { id: { in: ids } },
      });
      return claimed as unknown as OutboxEventRow[];
    });
  }

  async markSent(id: string, client: DbClient = db): Promise<void> {
    await client.outboxEvent.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });
  }

  async markRetry(
    id: string,
    error: string,
    nextAvailableAt: Date,
    client: DbClient = db,
  ): Promise<void> {
    await client.outboxEvent.update({
      where: { id },
      data: {
        status: "PENDING",
        availableAt: nextAvailableAt,
        lastError: error.slice(0, 4000),
      },
    });
  }

  async markFailed(id: string, error: string, client: DbClient = db): Promise<void> {
    await client.outboxEvent.update({
      where: { id },
      data: {
        status: "FAILED",
        lastError: error.slice(0, 4000),
      },
    });
  }

  /**
   * Record processed key after successful side effect.
   * Returns false if key already existed (idempotent skip).
   */
  async tryMarkProcessed(
    consumer: string,
    key: string,
    client: DbClient = db,
  ): Promise<boolean> {
    try {
      await client.outboxProcessedKey.create({
        data: { consumer, key },
      });
      return true;
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "P2002") return false;
      throw err;
    }
  }

  async hasProcessed(
    consumer: string,
    key: string,
    client: DbClient = db,
  ): Promise<boolean> {
    const row = await client.outboxProcessedKey.findUnique({
      where: { consumer_key: { consumer, key } },
      select: { id: true },
    });
    return Boolean(row);
  }

  /** Release a claim after a failed side effect so the relay retry can re-run. */
  async releaseProcessedKey(
    consumer: string,
    key: string,
    client: DbClient = db,
  ): Promise<void> {
    await client.outboxProcessedKey.deleteMany({
      where: { consumer, key },
    });
  }

  async createInAppNotification(
    input: {
      userId: string;
      title: string;
      body?: string | null;
      type?: string;
    },
    client: DbClient = db,
  ) {
    return client.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body ?? null,
        type: input.type ?? "info",
      },
    });
  }
}

export const outboxRepository = new OutboxRepository();
