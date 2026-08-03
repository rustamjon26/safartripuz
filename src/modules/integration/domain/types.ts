export type IntegrationCategory = "OTA" | "PAYMENT" | "LOCAL";

export type IntegrationConnectionStatus =
  | "DISCONNECTED"
  | "PENDING"
  | "CONNECTED"
  | "LICENSE_REQUIRED"
  | "ERROR";

export type ProviderDefinition = {
  key: string;
  name: string;
  category: IntegrationCategory;
  desc: string;
  badges?: string[];
  requiresLicense?: boolean;
  defaultMeta: string;
};

export type IntegrationItemView = {
  providerKey: string;
  name: string;
  category: IntegrationCategory;
  desc: string;
  badges: string[];
  status: IntegrationConnectionStatus;
  meta: string;
  externalHotelId: string | null;
  hasCredentials: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  connectionId: string | null;
};

export type IntegrationGroupView = {
  id: IntegrationCategory;
  title: string;
  items: IntegrationItemView[];
};
