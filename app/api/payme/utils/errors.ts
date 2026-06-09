export type PaymeLocalizedMessage = {
  ru: string;
  uz: string;
  en: string;
};

export type PaymeErrorDefinition = {
  code: number;
  message: PaymeLocalizedMessage;
};

export const PAYME_ERRORS = {
  INVALID_AUTHORIZATION: {
    code: -32300,
    message: {
      ru: "Неверная авторизация",
      uz: "Noto'g'ri avtorizatsiya",
      en: "Invalid authorization",
    },
  },
  METHOD_NOT_FOUND: {
    code: -32400,
    message: {
      ru: "Метод не найден",
      uz: "Metod topilmadi",
      en: "Method not found",
    },
  },
  AUTH_FAILED: {
    code: -32504,
    message: {
      ru: "Недостаточно привилегий",
      uz: "Ruxsat yo'q",
      en: "Insufficient privilege",
    },
  },
  ORDER_NOT_FOUND: {
    code: -31001,
    message: {
      ru: "Заказ не найден",
      uz: "Buyurtma topilmadi",
      en: "Order not found",
    },
  },
  TRANSACTION_CANCELLED: {
    code: -31003,
    message: {
      ru: "Транзакция отменена",
      uz: "Tranzaksiya bekor qilindi",
      en: "Transaction cancelled",
    },
  },
  UNABLE_TO_PERFORM: {
    code: -31008,
    message: {
      ru: "Невозможно выполнить транзакцию",
      uz: "Tranzaksiyani bajarib bo'lmaydi",
      en: "Unable to perform transaction",
    },
  },
  ORDER_ALREADY_PAID: {
    code: -31050,
    message: {
      ru: "Заказ уже оплачен",
      uz: "Buyurtma allaqachon to'langan",
      en: "Order already paid",
    },
  },
  AMOUNT_MISMATCH: {
    code: -31051,
    message: {
      ru: "Неверная сумма",
      uz: "Noto'g'ri summa",
      en: "Amount mismatch",
    },
  },
  SYSTEM_ERROR: {
    code: -31099,
    message: {
      ru: "Системная ошибка",
      uz: "Tizim xatoligi",
      en: "System error",
    },
  },
} as const satisfies Record<string, PaymeErrorDefinition>;

export type PaymeErrorKey = keyof typeof PAYME_ERRORS;

export function paymeRpcError(id: number, error: PaymeErrorDefinition, data?: string) {
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
