export const TAXI_ERRORS = {
  ORDER_NOT_FOUND: "Buyurtma topilmadi",
  INVALID_STATUS_TRANSITION: "Bu o'tish ruxsat etilmagan",
  DRIVER_OFFLINE: "Buyurtma qabul qilish uchun onlayn bo'ling",
  ORDER_ALREADY_ASSIGNED: "Bu buyurtma allaqachon qabul qilingan",
  CANNOT_CANCEL: "Bu bosqichda bekor qilib bo'lmaydi",
  REVIEW_ALREADY_EXISTS: "Siz allaqachon baho bildirdingiz",
  NO_ACTIVE_VEHICLE: "Aktiv transport vositangiz yo'q",
} as const;
