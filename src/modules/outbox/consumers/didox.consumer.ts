import { emitDidoxInvoiceForPayment } from "@/lib/didox/emitDidoxInvoiceForPayment";
import type { OutboxEventRow } from "../repository/outbox.repository";
import { withProcessedKey } from "./idempotency";

export async function consumeDidoxInvoice(event: OutboxEventRow): Promise<void> {
  const payload = event.payload as { paymentId?: string; dedupeKey?: string };
  const paymentId = payload.paymentId;
  if (!paymentId) return;
  const dedupeKey = payload.dedupeKey ?? `didox:${paymentId}`;

  await withProcessedKey("didox", dedupeKey, async () => {
    await emitDidoxInvoiceForPayment(paymentId);
  });
}
