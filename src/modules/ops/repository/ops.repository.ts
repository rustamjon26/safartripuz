import { prisma } from "@/src/shared/db/prisma";

/** SystemSetting key holding a worker's last successful run. */
export function heartbeatKey(worker: string): string {
  return `worker_heartbeat:${worker}`;
}

export class OpsRepository {
  async pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }

  /**
   * Oldest PENDING event whose retry backoff has already elapsed. Events still
   * waiting on backoff are working as designed and must not look like a stall.
   */
  async oldestDueOutboxEvent(
    now: Date,
  ): Promise<{ createdAt: Date; attempts: number } | null> {
    const row = await prisma.outboxEvent.findFirst({
      where: { status: "PENDING", availableAt: { lte: now } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, attempts: true },
    });
    return row ?? null;
  }

  async countOutbox(status: "PENDING" | "FAILED"): Promise<number> {
    return prisma.outboxEvent.count({ where: { status } });
  }

  async readHeartbeat(worker: string): Promise<Date | null> {
    const row = await prisma.systemSetting.findUnique({
      where: { key: heartbeatKey(worker) },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  /** Called by workers after a successful run; `updatedAt` is the heartbeat. */
  async recordHeartbeat(worker: string, at: Date = new Date()): Promise<void> {
    const key = heartbeatKey(worker);
    const value = { at: at.toISOString() };
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

export const opsRepository = new OpsRepository();
