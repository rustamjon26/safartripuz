import type { DbClient } from "@/src/modules/payment/repository/db";
import type { EnqueueEventInput } from "../domain/types";
import { outboxRepository } from "../repository/outbox.repository";

export class OutboxService {
  /** Enqueue only — never send network I/O here. */
  async enqueueInTx(tx: DbClient, event: EnqueueEventInput) {
    return outboxRepository.enqueueInTx(tx, event);
  }

  async enqueueManyInTx(tx: DbClient, events: EnqueueEventInput[]) {
    const out = [];
    for (const e of events) {
      out.push(await outboxRepository.enqueueInTx(tx, e));
    }
    return out;
  }
}

export const outboxService = new OutboxService();
