export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  REJECTED: "Rad etilgan",
  BLOCKED: "Bloklangan",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
  COMPLETED: "Tugallangan",
  NO_SHOW: "Kelmadi",
  CHECKED_IN: "Kirdi",
  CHECKED_OUT: "Chiqdi",
  DISPUTE: "Nizo",
  ALL: "Hammasi",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}
