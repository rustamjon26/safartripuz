import { prisma } from "@/lib/prisma";

/** No driver accepted within this window → the order is cancelled by the system. */
export const TAXI_PENDING_TIMEOUT_MS = 5 * 60 * 1000;

const TIMEOUT_REASON = "Timeout — hech bir haydovchi qabul qilmadi";

/**
 * Cancel PENDING taxi orders nobody accepted in time.
 *
 * Runs from the expiry cron (scripts/expire-booking-holds.ts), so two ticks —
 * or a tick racing a driver pressing "accept" — can see the same row. The
 * status guard lives in the UPDATE itself: whoever changes 0 rows lost the race
 * and writes no log, so the order log never gains a duplicate CANCELLED entry.
 */
export async function expirePendingTaxiOrders(limit = 100): Promise<number> {
  const threshold = new Date(Date.now() - TAXI_PENDING_TIMEOUT_MS);
  const candidates = await prisma.taxiOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: threshold },
    },
    select: { id: true, customerId: true },
    take: limit,
  });

  if (candidates.length === 0) return 0;

  let cancelled = 0;
  for (const order of candidates) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        const changed = await tx.$executeRaw`
          UPDATE TaxiOrder
          SET status = 'CANCELLED',
              cancelledBy = 'SYSTEM',
              cancellationReason = ${TIMEOUT_REASON},
              updatedAt = NOW(3)
          WHERE id = ${order.id}
            AND status = 'PENDING'
            AND createdAt < ${threshold}
        `;
        if (Number(changed) === 0) return false;

        await tx.taxiOrderLog.create({
          data: {
            orderId: order.id,
            actorId: order.customerId,
            actorRole: "system",
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            note: TIMEOUT_REASON,
          },
        });
        return true;
      });
      if (done) cancelled += 1;
    } catch (err) {
      console.error("[expireTaxiOrders] failed", order.id, err);
    }
  }

  return cancelled;
}
