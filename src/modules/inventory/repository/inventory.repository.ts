import { Prisma } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";
import { formatDateOnly, utcDateOnly } from "../domain/nights";
import {
  InventoryNegativeError,
  InventoryNotProvisionedError,
} from "../domain/errors";

export type Tx = Prisma.TransactionClient;

/** Serializable tx with deadlock/retryable detection for service layer (no prisma in service). */
export function isRetryableInventoryLockError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2034") return true;
    const msg = String(err.message);
    if (msg.includes("1213") || msg.includes("1205") || msg.includes("Deadlock")) {
      return true;
    }
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("1213") || msg.includes("1205") || msg.includes("Deadlock")) {
      return true;
    }
  }
  return false;
}

type LockedRow = {
  id: string;
  date: Date;
  availableRooms: number;
  totalRooms: number;
  version: number;
};

export class InventoryRepository {
  async countActivePhysicalRooms(
    roomTypeId: string,
    client: Tx | typeof prisma = prisma,
  ): Promise<number> {
    return client.physicalRoom.count({
      where: { roomTypeId, isActive: true },
    });
  }

  /**
   * Insert missing Inventory rows for [from, to) with totalRooms capacity.
   * Does not lock; call before FOR UPDATE select.
   */
  async ensureRows(
    roomTypeId: string,
    nights: Date[],
    totalRooms: number,
    client: Tx,
  ): Promise<void> {
    if (nights.length === 0 || totalRooms <= 0) return;

    for (const night of nights) {
      const date = utcDateOnly(night);
      await client.inventory.upsert({
        where: {
          roomTypeId_date: { roomTypeId, date },
        },
        create: {
          roomTypeId,
          date,
          totalRooms,
          availableRooms: totalRooms,
          version: 0,
        },
        update: {},
      });
    }
  }

  /** SELECT … FOR UPDATE for nights in [checkIn, checkOut). */
  async lockNightsForUpdate(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
    client: Tx,
  ): Promise<LockedRow[]> {
    const from = formatDateOnly(checkIn);
    const to = formatDateOnly(checkOut);
    const rows = await client.$queryRawUnsafe<LockedRow[]>(
      `SELECT id, date, availableRooms, totalRooms, version
       FROM Inventory
       WHERE roomTypeId = ? AND date >= ? AND date < ?
       ORDER BY date
       FOR UPDATE`,
      roomTypeId,
      from,
      to,
    );
    return rows;
  }

  async decrementLockedNights(
    rows: LockedRow[],
    roomCount: number,
    client: Tx,
  ): Promise<void> {
    for (const row of rows) {
      const next = row.availableRooms - roomCount;
      if (next < 0) {
        console.error("ALERT inventory_negative", {
          inventoryId: row.id,
          availableRooms: row.availableRooms,
          roomCount,
        });
        throw new InventoryNegativeError();
      }
      await client.inventory.update({
        where: { id: row.id },
        data: {
          availableRooms: next,
          version: { increment: 1 },
        },
      });
    }
  }

  async releaseNights(
    roomTypeId: string,
    nights: Date[],
    roomCount: number,
    client: Tx,
  ): Promise<void> {
    for (const night of nights) {
      const date = utcDateOnly(night);
      const row = await client.inventory.findUnique({
        where: { roomTypeId_date: { roomTypeId, date } },
      });
      if (!row) continue;

      const next = Math.min(row.totalRooms, row.availableRooms + roomCount);
      if (next > row.totalRooms) {
        console.error("ALERT inventory_over_total", { inventoryId: row.id, next, total: row.totalRooms });
      }
      await client.inventory.update({
        where: { id: row.id },
        data: {
          availableRooms: next,
          version: { increment: 1 },
        },
      });
    }
  }

  async adjustTotalRoomsFuture(
    roomTypeId: string,
    delta: number,
    fromDate: Date,
    client: Tx | typeof prisma = prisma,
  ): Promise<void> {
    if (delta === 0) return;
    const from = formatDateOnly(fromDate);
    const rows = await client.inventory.findMany({
      where: { roomTypeId, date: { gte: utcDateOnly(fromDate) } },
    });
    for (const row of rows) {
      const newTotal = Math.max(0, row.totalRooms + delta);
      let newAvailable = row.availableRooms + delta;
      if (newAvailable < 0) {
        console.error("ALERT inventory_negative adjustTotal", { id: row.id, from });
        newAvailable = 0;
      }
      if (newAvailable > newTotal) newAvailable = newTotal;
      await client.inventory.update({
        where: { id: row.id },
        data: { totalRooms: newTotal, availableRooms: newAvailable, version: { increment: 1 } },
      });
    }
  }

  assertAllNightsPresent(expectedNights: Date[], locked: LockedRow[]): void {
    if (locked.length !== expectedNights.length) {
      throw new InventoryNotProvisionedError(
        `Expected ${expectedNights.length} inventory nights, locked ${locked.length}`,
      );
    }
  }

  async runSerializable<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => fn(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}

export const inventoryRepository = new InventoryRepository();
