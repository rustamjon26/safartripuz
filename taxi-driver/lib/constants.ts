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
export const PLATFORM_FEE_PERCENT = 15;
export const COLORS = {
  primary: "#1F4E79",
  primaryLight: "#2E75B6",
  primarySoft: "#EAF1F8",
  success: "#27AE60",
  warning: "#F39C12",
  warningLight: "#FFF3CD",
  danger: "#E74C3C",
  gray: "#95A5A6",
  lightGray: "#ECF0F1",
  white: "#FFFFFF",
  dark: "#2C3E50",
  text: "#333333",
  textSecondary: "#7F8C8D",
  star: "#F1C40F",
  overlayDark: "rgba(0,0,0,0.35)",
};
export const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F39C12",
  ACCEPTED: "#2E75B6",
  ARRIVED: "#8E44AD",
  IN_PROGRESS: "#27AE60",
  COMPLETED: "#1F4E79",
  SETTLED: "#27AE60",
  CANCELLED: "#E74C3C",
  DISPUTE: "#E74C3C",
};
