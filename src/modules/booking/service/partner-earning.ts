import type { Prisma } from "@prisma/client";

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

  const gross = earning.grossTiyin;
  const fee = earning.commissionFeeTiyin;
  const net = earning.netTiyin;

  // Mirror computeRefund's truncation exactly: refund share is truncated,
  // PE keeps the complement. `(x * remain) / 100n` would truncate the OTHER
  // way and drift 1 tiyin from the ledger's refundTiyin on odd amounts.
  const pct = BigInt(refundPercent);
  const refundGross = (gross * pct) / 100n;
  const refundFee = (fee * pct) / 100n;
  // Net refund is the remainder so fee+net == gross stays true post-reverse.
  const refundNet = refundGross - refundFee;

  const nextGross = gross - refundGross;
  const nextFee = fee - refundFee;
  const nextNet = net - refundNet;

  await tx.partnerEarning.update({
    where: { id: earning.id },
    data: {
      grossTiyin: nextGross,
      commissionFeeTiyin: nextFee,
      netTiyin: nextNet,
    },
  });
}
