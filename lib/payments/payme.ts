export interface PaymeRpcRequest {
  method: string;
  params: {
    id?: string;
    time?: number;
    amount?: number;
    account?: { order_id?: string };
    reason?: number;
  };
  id: number;
}

export function verifyPaymeAuth(authHeader: string, merchantKey: string): boolean {
  if (!merchantKey) return false;
  const expected = Buffer.from(`Paycom:${merchantKey}`).toString("base64");
  return authHeader === `Basic ${expected}`;
}

export const PAYME_ERRORS = {
  INSUFFICIENT_PRIVILEGE: {
    code: -32504,
    message: { ru: "Недостаточно привилегий", uz: "Ruxsat yo'q", en: "Insufficient privilege" },
  },
  TRANSACTION_NOT_FOUND: {
    code: -31003,
    message: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" },
  },
  WRONG_AMOUNT: {
    code: -31001,
    message: { ru: "Неверная сумма", uz: "Noto'g'ri summa", en: "Wrong amount" },
  },
  ORDER_NOT_FOUND: {
    code: -31050,
    message: { ru: "Заказ не найден", uz: "Buyurtma topilmadi", en: "Order not found" },
  },
  ORDER_ALREADY_PAID: {
    code: -31099,
    message: { ru: "Заказ уже оплачен", uz: "Buyurtma allaqachon to'langan", en: "Order already paid" },
  },
  UNABLE_TO_CANCEL: {
    code: -31007,
    message: { ru: "Невозможно отменить", uz: "Bekor qilib bo'lmaydi", en: "Unable to cancel" },
  },
} as const;

export type PaymeErrorKey = keyof typeof PAYME_ERRORS;
