import { prisma } from "@/lib/prisma";

export type ClickProviderConfig = {
  enabled?: boolean;
  serviceId?: string;
  merchantId?: string;
  secretKey?: string;
};

export type PaymeProviderConfig = {
  enabled?: boolean;
  merchantId?: string;
  secretKey?: string;
  merchantKey?: string;
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export async function getPaymentProvidersConfig() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "payment_providers" },
  });
  return asRecord(setting?.value);
}

export function getClickConfig(providers: Record<string, unknown>): ClickProviderConfig {
  return asRecord(providers.click ?? providers.CLICK) as ClickProviderConfig;
}

export function getPaymeConfig(providers: Record<string, unknown>): PaymeProviderConfig {
  return asRecord(providers.payme ?? providers.PAYME) as PaymeProviderConfig;
}

export function paymeMerchantKey(config: PaymeProviderConfig): string {
  return config.merchantKey ?? config.secretKey ?? "";
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    ""
  );
}
