export const GENERAL_SETTINGS_KEY = "general_settings";

export type GeneralSettings = {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  defaultCurrency: "UZS" | "USD" | "EUR";
  enableNotifications: boolean;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  siteName: "SafarTrip",
  contactEmail: "admin@safartrip.uz",
  contactPhone: "+998 71 234 56 78",
  defaultCurrency: "UZS",
  enableNotifications: true,
};

export function mergeGeneralSettings(raw: unknown): GeneralSettings {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_GENERAL_SETTINGS };
  }

  const value = raw as Record<string, unknown>;
  const currency = value.defaultCurrency;

  return {
    siteName:
      typeof value.siteName === "string" && value.siteName.trim()
        ? value.siteName.trim()
        : DEFAULT_GENERAL_SETTINGS.siteName,
    contactEmail:
      typeof value.contactEmail === "string" && value.contactEmail.trim()
        ? value.contactEmail.trim()
        : DEFAULT_GENERAL_SETTINGS.contactEmail,
    contactPhone:
      typeof value.contactPhone === "string" ? value.contactPhone.trim() : DEFAULT_GENERAL_SETTINGS.contactPhone,
    defaultCurrency:
      currency === "UZS" || currency === "USD" || currency === "EUR"
        ? currency
        : DEFAULT_GENERAL_SETTINGS.defaultCurrency,
    enableNotifications:
      typeof value.enableNotifications === "boolean"
        ? value.enableNotifications
        : DEFAULT_GENERAL_SETTINGS.enableNotifications,
  };
}
