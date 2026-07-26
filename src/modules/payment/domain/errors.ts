export type PaymeLocalizedMessage = {
  ru: string;
  uz: string;
  en: string;
};

export type PaymeErrorDefinition = {
  code: number;
  message: PaymeLocalizedMessage;
};

/** Aligned Payme merchant error map (state ≠ receipt-state). */
export const PAYME_ERRORS = {
  NOT_POST: {
    code: -32300,
    message: { ru: "Метод должен быть POST", uz: "Faqat POST", en: "Must be POST" },
  },
  PARSE_ERROR: {
    code: -32700,
    message: { ru: "Ошибка разбора", uz: "Parse xatosi", en: "Parse error" },
  },
  INVALID_REQUEST: {
    code: -32600,
    message: { ru: "Неверный запрос", uz: "Noto'g'ri so'rov", en: "Invalid request" },
  },
  METHOD_NOT_FOUND: {
    code: -32601,
    message: { ru: "Метод не найден", uz: "Metod topilmadi", en: "Method not found" },
  },
  INTERNAL: {
    code: -32400,
    message: { ru: "Системная ошибка", uz: "Tizim xatoligi", en: "Internal error" },
  },
  AUTH_FAILED: {
    code: -32504,
    message: {
      ru: "Недостаточно привилегий",
      uz: "Ruxsat yo'q",
      en: "Insufficient privilege",
    },
  },
  WRONG_AMOUNT: {
    code: -31001,
    message: { ru: "Неверная сумма", uz: "Noto'g'ri summa", en: "Wrong amount" },
  },
  TRANSACTION_NOT_FOUND: {
    code: -31003,
    message: {
      ru: "Транзакция не найдена",
      uz: "Tranzaksiya topilmadi",
      en: "Transaction not found",
    },
  },
  UNABLE_TO_CANCEL: {
    code: -31007,
    message: {
      ru: "Невозможно отменить",
      uz: "Bekor qilib bo'lmaydi",
      en: "Unable to cancel",
    },
  },
  BAD_STATE: {
    code: -31008,
    message: {
      ru: "Невозможно выполнить операцию",
      uz: "Operatsiyani bajarib bo'lmaydi",
      en: "Bad transaction state",
    },
  },
  INVALID_ACCOUNT: {
    code: -31050,
    message: {
      ru: "Неверный account",
      uz: "Noto'g'ri account",
      en: "Invalid account",
    },
  },
  ORDER_ALREADY_PAID: {
    code: -31099,
    message: {
      ru: "Заказ уже оплачен",
      uz: "Buyurtma allaqachon to'langan",
      en: "Order already paid",
    },
  },
} as const satisfies Record<string, PaymeErrorDefinition>;

export function paymeRpcError(
  id: number,
  error: PaymeErrorDefinition,
  data?: string,
) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: error.code,
      message: error.message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

export function paymeRpcSuccess<T extends object>(id: number, result: T) {
  return {
    jsonrpc: "2.0" as const,
    id,
    result,
  };
}

export const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INCORRECT_PARAMS: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  TRANSACTION_NOT_FOUND: -5,
  TRANSACTION_CANCELLED: -6,
  /** @deprecated use ALREADY_PAID (-4) per harden plan */
  TRANSACTION_COMPLETED: -7,
  TRANSACTION_EXPIRED: -8,
  ORDER_CANCELLED: -9,
} as const;
