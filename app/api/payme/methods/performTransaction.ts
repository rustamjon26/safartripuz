import { prisma } from "@/lib/prisma";
import { commissionService } from "@/src/modules/commission";
import { createPartnerEarningIfMissing } from "@/lib/payments/completeSuccessfulPaymentTx";
import { MissingPartnerError, ledgerService } from "@/src/modules/ledger";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import {
  autoCancelExpiredTransaction,
  normalizePaymeTransactionId,
  paymeTransactionInclude,
  toPerformTransactionResult,
  type PaymeRpcParams,
} from "../utils/helpers";

export async function performTransaction(id: number, params: PaymeRpcParams) {
  const paymeId = normalizePaymeTransactionId(params.id);
  if (!paymeId) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const transaction = await prisma.paymeTransaction.findUnique({
    where: { paymeId },
    include: paymeTransactionInclude,
  });

  if (!transaction) {
    console.log("[Payme] PerformTransaction not found by paymeId:", paymeId);
    return paymeRpcError(id, PAYME_ERRORS.ORDER_NOT_FOUND);
  }

  if (transaction.state === -1 || transaction.state === -2) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (transaction.state === 2) {
    return paymeRpcSuccess(id, toPerformTransactionResult(transaction));
  }

  if (transaction.state !== 1) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const expired = await autoCancelExpiredTransaction(transaction);
  if (expired.state === -1 || expired.state === -2) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  if (expired.state === 2) {
    return paymeRpcSuccess(id, toPerformTransactionResult(expired));
  }

  if (expired.state !== 1) {
    return paymeRpcError(id, PAYME_ERRORS.UNABLE_TO_PERFORM);
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id: transaction.booking.hotelId },
    select: {
      ownerType: true,
      partner: { select: { userId: true } },
    },
  });
  const payoutOwnerType = hotel?.ownerType ?? "PARTNER";
  const partnerUserId = hotel?.partner?.userId ?? null;

  if (payoutOwnerType === "PARTNER" && !partnerUserId) {
    console.error("ALERT payme_legacy_missing_partner", {
      paymeId,
      bookingId: expired.bookingId,
    });
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  const performTime = BigInt(Date.now());

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const performed = await tx.paymeTransaction.update({
        where: { id: expired.id },
        data: {
          state: 2,
          performTime,
        },
      });

      await tx.booking.update({
        where: { id: expired.bookingId },
        data: { status: "PAID", payoutOwnerType },
      });

      const rates = await commissionService.getRates(tx);
      const grossTiyin = BigInt(expired.amount);

      if (payoutOwnerType === "PLATFORM") {
        await ledgerService.record(
          {
            idempotencyKey: `payme:${paymeId}`,
            bookingId: expired.bookingId,
            bookingType: "HOTEL",
            grossTiyin,
            payoutOwnerType: "PLATFORM",
          },
          tx,
        );
      } else {
        if (!partnerUserId) {
          throw new MissingPartnerError(
            `Hotel partner missing for booking ${expired.bookingId}`,
          );
        }
        // Dual-write: PartnerEarning + ledger in the same transaction.
        await createPartnerEarningIfMissing(tx, {
          partnerId: partnerUserId,
          bookingType: "HOTEL",
          bookingId: expired.bookingId,
          grossTiyin,
          rate: rates.HOTEL,
        });

        await ledgerService.record(
          {
            idempotencyKey: `payme:${paymeId}`,
            bookingId: expired.bookingId,
            bookingType: "HOTEL",
            grossTiyin,
            partnerUserId,
            payoutOwnerType: "PARTNER",
            ratePercent: rates.HOTEL,
          },
          tx,
        );
      }

      return performed;
    });

    return paymeRpcSuccess(
      id,
      toPerformTransactionResult({
        id: updated.id,
        performTime: updated.performTime,
        state: 2,
      }),
    );
  } catch (err) {
    if (err instanceof MissingPartnerError) {
      return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
    }
    throw err;
  }
}
