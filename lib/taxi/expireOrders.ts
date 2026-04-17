import { prisma } from "@/lib/prisma";

export async function expirePendingTaxiOrders() {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  const expired = await prisma.taxiOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: threshold },
    },
    select: { id: true, customerId: true, status: true },
  });

  if (expired.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const order of expired) {
      await tx.taxiOrder.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledBy: "SYSTEM",
          cancellationReason: "Timeout — hech bir haydovchi qabul qilmadi",
        },
      });

      await tx.taxiOrderLog.create({
        data: {
          orderId: order.id,
          actorId: order.customerId,
          actorRole: "system",
          fromStatus: order.status,
          toStatus: "CANCELLED",
          note: "Timeout — hech bir haydovchi qabul qilmadi",
        },
      });
    }
  });

  return expired.length;
}
