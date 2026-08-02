import type { Prisma } from "@prisma/client";
import { Money } from "@/src/shared/money";

type Tx = Prisma.TransactionClient;

/**
 * Proportional PartnerEarning reverse (mutate remaining amounts / CANCELLED).
 * Must run in the same transaction as the ledger refund compensation.
 */
export async function reversePartnerEarningInTx(
  tx: Tx,
  bookingType: "HOTEL" | "HOMESTAY" | "GUIDE",
  bookingId: string,
  refundPercent: number,
): Promise<void> {
  const earning = await tx.partnerEarning.findUnique({
    where: {
      bookingType_bookingId: { bookingType, bookingId },
    },
  });
  if (!earning || earning.status === "CANCELLED") return;

  if (refundPercent >= 100) {
    await tx.partnerEarning.update({
      where: { id: earning.id },
      data: { status: "CANCELLED" },
    });
    return;
  }

  const remain = 100 - refundPercent;
  const gross = Money.fromSomNumber(earning.grossAmount.toString()).toTiyin();
  const fee = Money.fromSomNumber(earning.commissionFee.toString()).toTiyin();
  const net = Money.fromSomNumber(earning.netAmount.toString()).toTiyin();
  const nextGross = (gross * BigInt(remain)) / 100n;
  const nextFee = (fee * BigInt(remain)) / 100n;
  const nextNet = (net * BigInt(remain)) / 100n;

  await tx.partnerEarning.update({
    where: { id: earning.id },
    data: {
      grossAmount: Money.fromTiyin(nextGross).toSomNumber(),
      commissionFee: Money.fromTiyin(nextFee).toSomNumber(),
      netAmount: Money.fromTiyin(nextNet).toSomNumber(),
    },
  });
}
