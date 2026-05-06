import { Platform } from "react-native";

/**
 * Platform-based default API URL.
 * - Android emulator can't reach host `localhost`, so use `10.0.2.2`.
 * - iOS simulator / web use `localhost` directly.
 *
 * On a physical device neither works — user must override via the
 * Dev Settings screen (saved in SecureStore, see `lib/api.ts`).
 */
export const DEFAULT_API_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000";

/**
 * Compile-time default. The runtime effective URL is resolved in
 * `lib/api.ts` and prefers the SecureStore override when present.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export const COLORS = {
  primary: "#1F4E79",
  primaryLight: "#2E75B6",
  secondary: "#F0A500",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
  gray: "#95A5A6",
  lightGray: "#ECF0F1",
  white: "#FFFFFF",
  dark: "#2C3E50",
  text: "#333333",
  textSecondary: "#7F8C8D",
  background: "#F8F9FA",
  /** Modal / sheet scrim */
  overlay: "rgba(0,0,0,0.45)",
  shadow: "#000000",
  star: "#F1C40F",
  /** Selected chip / card highlight */
  chipSelected: "#E8F0F8",
  surfaceSuccess: "#E8F8EE",
  surfaceWarning: "#FEF5E7",
  surfaceDanger: "#FDEDEC",
  dangerBorder: "#F5B7B1",
};

/** RN fetch failures */
export const NETWORK_ERROR_MESSAGE = "Internet aloqasi yo'q";

/** Taxi order lifecycle (mijoz ilovasi bronlar / buyurtmalar) */
export const TAXI_ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "#F39C12",
  ACCEPTED: "#2E75B6",
  ARRIVED: "#8E44AD",
  IN_PROGRESS: "#27AE60",
  COMPLETED: "#1F4E79",
  SETTLED: "#27AE60",
  CANCELLED: "#E74C3C",
  DISPUTE: "#E74C3C",
};

export const TAXI_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  ACCEPTED: "Qabul qilindi",
  ARRIVED: "Yetib keldim",
  IN_PROGRESS: "Yo'lda",
  COMPLETED: "Tugallandi",
  SETTLED: "To'landi",
  CANCELLED: "Bekor qilindi",
  DISPUTE: "Nizo",
};

export type PaymentProviderStyle = { bg: string; fg: string; label: string };

export const PAYMENT_PROVIDER_STYLES: Record<string, PaymentProviderStyle> = {
  CLICK: { bg: "#E3F2FD", fg: "#1565C0", label: "Click" },
  PAYME: { bg: "#E8F5E9", fg: "#2E7D32", label: "Payme" },
  MANUAL: { bg: "#ECEFF1", fg: "#546E7A", label: "Qo'lda" },
  MOCK: { bg: "#F3E5F5", fg: "#6A1B9A", label: "Test" },
  UZUM: { bg: "#FFF3E0", fg: "#E65100", label: "Uzum" },
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: "#F39C12",
  CONFIRMED: "#27AE60",
  CHECKED_IN: "#2E75B6",
  IN_PROGRESS: "#2E75B6",
  COMPLETED: "#1F4E79",
  CANCELLED: "#E74C3C",
  DISPUTE: "#E74C3C",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlandi",
  CHECKED_IN: "Check-in",
  IN_PROGRESS: "Jarayonda",
  COMPLETED: "Tugallandi",
  CANCELLED: "Bekor qilindi",
  DISPUTE: "Nizo",
  PENDING_PAYMENT: "To'lov kutilmoqda",
};

/** TravelPlan.status */
export const TRAVEL_PLAN_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#95A5A6",
  PENDING_PAYMENT: "#F39C12",
  CONFIRMED: "#27AE60",
  CANCELLED: "#E74C3C",
};

export const TRAVEL_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Qoralama",
  PENDING_PAYMENT: "To'lov kutilmoqda",
  CONFIRMED: "Tasdiqlandi",
  CANCELLED: "Bekor qilindi",
};

/** Payment.status */
export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  INITIATED: "#95A5A6",
  PENDING: "#F39C12",
  SUCCESS: "#27AE60",
  FAILED: "#E74C3C",
  CANCELLED: "#95A5A6",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  INITIATED: "Boshlangan",
  PENDING: "Kutilmoqda",
  SUCCESS: "Muvaffaqiyatli",
  FAILED: "Muvaffaqiyatsiz",
  CANCELLED: "Bekor",
};
