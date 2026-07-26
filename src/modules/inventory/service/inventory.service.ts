import { enumerateNights } from "../domain/nights";
import {
  InsufficientInventoryError,
  InventoryLockError,
} from "../domain/errors";
import {
  inventoryRepository,
  isRetryableInventoryLockError,
  type Tx,
} from "../repository/inventory.repository";

const MAX_LOCK_RETRIES = 3;

function jitterMs(): number {
  return 50 + Math.floor(Math.random() * 100);
}

export type ReserveInput = {
  roomTypeId: string;
  checkIn: Date;
  checkOut: Date;
  roomCount: number;
};

/**
 * Payme auto-cancels an unconfirmed transaction after 12 hours (state -1, reason 4).
 * Our 15-minute hold is intentionally shorter; the expiry job must handle a payment
 * arriving AFTER the hold expired (re-check availability before honouring it).
 */
export const HOLD_TTL_MS = 15 * 60 * 1000;

export class InventoryService {
  /**
   * Ensure rows, lock FOR UPDATE, verify capacity, decrement.
   * Must be called inside an existing Serializable transaction client.
   */
  async reserveRoomNightsInTx(input: ReserveInput, tx: Tx): Promise<void> {
    const nights = enumerateNights(input.checkIn, input.checkOut);
    const totalRooms = await inventoryRepository.countActivePhysicalRooms(
      input.roomTypeId,
      tx,
    );
    if (totalRooms <= 0) {
      throw new InsufficientInventoryError("Bu xona turi uchun faol xonalar yo'q");
    }

    await inventoryRepository.ensureRows(
      input.roomTypeId,
      nights,
      totalRooms,
      tx,
    );

    const locked = await inventoryRepository.lockNightsForUpdate(
      input.roomTypeId,
      input.checkIn,
      input.checkOut,
      tx,
    );
    inventoryRepository.assertAllNightsPresent(nights, locked);

    for (const row of locked) {
      if (row.availableRooms < input.roomCount) {
        throw new InsufficientInventoryError();
      }
    }

    await inventoryRepository.decrementLockedNights(locked, input.roomCount, tx);
  }

  async releaseRoomNightsInTx(input: ReserveInput, tx: Tx): Promise<void> {
    const nights = enumerateNights(input.checkIn, input.checkOut);
    await inventoryRepository.releaseNights(
      input.roomTypeId,
      nights,
      input.roomCount,
      tx,
    );
  }

  /** Full reserve in its own Serializable transaction with deadlock retry. */
  async reserveWithRetry(input: ReserveInput): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
      try {
        await inventoryRepository.runSerializable(async (tx) => {
          await this.reserveRoomNightsInTx(input, tx);
        });
        return;
      } catch (err) {
        lastError = err;
        if (
          err instanceof InsufficientInventoryError ||
          !isRetryableInventoryLockError(err) ||
          attempt === MAX_LOCK_RETRIES
        ) {
          if (isRetryableInventoryLockError(err) && attempt === MAX_LOCK_RETRIES) {
            throw new InventoryLockError();
          }
          throw err;
        }
        await new Promise((r) => setTimeout(r, jitterMs()));
      }
    }
    throw lastError instanceof Error ? lastError : new InventoryLockError();
  }

  async withSerializableRetry<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
      try {
        return await inventoryRepository.runSerializable(fn);
      } catch (err) {
        lastError = err;
        if (
          err instanceof InsufficientInventoryError ||
          !isRetryableInventoryLockError(err) ||
          attempt === MAX_LOCK_RETRIES
        ) {
          if (isRetryableInventoryLockError(err) && attempt === MAX_LOCK_RETRIES) {
            throw new InventoryLockError();
          }
          throw err;
        }
        await new Promise((r) => setTimeout(r, jitterMs()));
      }
    }
    throw lastError instanceof Error ? lastError : new InventoryLockError();
  }

  async adjustTotalRooms(roomTypeId: string, delta: number): Promise<void> {
    await inventoryRepository.adjustTotalRoomsFuture(roomTypeId, delta, new Date());
  }
}

export const inventoryService = new InventoryService();
