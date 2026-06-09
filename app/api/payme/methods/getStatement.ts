import { prisma } from "@/lib/prisma";
import { PAYME_ERRORS, paymeRpcError, paymeRpcSuccess } from "../utils/errors";
import { serializePaymeTransaction, type PaymeRpcParams } from "../utils/helpers";

export async function getStatement(id: number, params: PaymeRpcParams) {
  const from = params.from;
  const to = params.to;

  if (typeof from !== "number" || typeof to !== "number" || !Number.isFinite(from) || !Number.isFinite(to)) {
    return paymeRpcError(id, PAYME_ERRORS.SYSTEM_ERROR);
  }

  if (from > to) {
    return paymeRpcSuccess(id, { transactions: [] });
  }

  const transactions = await prisma.paymeTransaction.findMany({
    where: {
      paymeTime: {
        gte: BigInt(from),
        lte: BigInt(to),
      },
    },
    include: {
      booking: {
        include: {
          hotel: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { paymeTime: "asc" },
  });

  return paymeRpcSuccess(id, {
    transactions: transactions.map(serializePaymeTransaction),
  });
}
