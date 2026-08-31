import {
  getProvider,
  paymentEnvConnected,
  PROVIDER_CATALOG,
} from "../domain/catalog";
import {
  connectIntegrationSchema,
  disconnectIntegrationSchema,
} from "../domain/validate";
import type {
  IntegrationConnectionStatus,
  IntegrationGroupView,
  IntegrationItemView,
} from "../domain/types";
import { integrationRepository } from "../repository/integration.repository";

const GROUP_TITLES: Record<string, string> = {
  OTA: "Onlayn bron qilish tizimlari (OTA)",
  PAYMENT: "To‘lov tizimlari (Payment Gateways)",
  LOCAL: "Mahalliy xizmatlar (Taxi/Guides)",
};

export class IntegrationNotFoundError extends Error {
  constructor(message = "Integratsiya topilmadi") {
    super(message);
    this.name = "IntegrationNotFoundError";
  }
}

function encodeCredentials(
  credentials: Record<string, string | number | boolean> | undefined,
): string | null {
  if (!credentials || Object.keys(credentials).length === 0) return null;
  // Foundation: opaque JSON. Production should encrypt at rest (KMS).
  return JSON.stringify(credentials);
}

export class IntegrationService {
  async listGrouped(hotelId: string): Promise<IntegrationGroupView[]> {
    const rows = await integrationRepository.listForHotel(hotelId);
    const byKey = new Map(rows.map((r) => [r.providerKey, r]));

    const items: IntegrationItemView[] = PROVIDER_CATALOG.map((p) => {
      const row = byKey.get(p.key);
      let status: IntegrationConnectionStatus =
        row?.status ??
        (p.requiresLicense ? "LICENSE_REQUIRED" : "DISCONNECTED");
      let meta = row?.meta ?? p.defaultMeta;

      // Payment providers: infer CONNECTED from platform env when no hotel row.
      if (!row && p.category === "PAYMENT" && paymentEnvConnected(p.key)) {
        status = "CONNECTED";
        meta = "Platforma orqali faol";
      }

      return {
        providerKey: p.key,
        name: p.name,
        category: p.category,
        desc: p.desc,
        badges: p.badges ?? [],
        status,
        meta,
        externalHotelId: row?.externalHotelId ?? null,
        hasCredentials: Boolean(row?.credentialsEnc),
        lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
        lastError: row?.lastError ?? null,
        connectionId: row?.id ?? null,
      };
    });

    const order: Array<"OTA" | "PAYMENT" | "LOCAL"> = [
      "OTA",
      "PAYMENT",
      "LOCAL",
    ];
    return order.map((id) => ({
      id,
      title: GROUP_TITLES[id],
      items: items.filter((i) => i.category === id),
    }));
  }

  async connect(
    hotelId: string,
    raw: unknown,
  ): Promise<IntegrationItemView> {
    const parsed = connectIntegrationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid connect: ${parsed.error.message}`);
    }
    const data = parsed.data;
    const provider = getProvider(data.providerKey);
    if (!provider) throw new IntegrationNotFoundError("Provider noma’lum");

    let status: IntegrationConnectionStatus = "CONNECTED";
    let meta = "Ulangan";
    if (data.licenseRequired || provider.requiresLicense) {
      if (!data.credentials && !data.externalHotelId) {
        status = "LICENSE_REQUIRED";
        meta = "Litsenziya talab etiladi";
      }
    }
    if (provider.category === "OTA" && !data.externalHotelId && status === "CONNECTED") {
      status = "PENDING";
      meta = "Hotel code kutilmoqda";
    }

    await integrationRepository.upsert({
      hotelId,
      providerKey: data.providerKey,
      category: provider.category,
      status,
      externalHotelId: data.externalHotelId ?? null,
      credentialsEnc: encodeCredentials(data.credentials),
      meta: data.meta ?? meta,
      lastError: null,
    });

    const groups = await this.listGrouped(hotelId);
    const item = groups
      .flatMap((g) => g.items)
      .find((i) => i.providerKey === data.providerKey);
    if (!item) throw new IntegrationNotFoundError();
    return item;
  }

  async disconnect(hotelId: string, raw: unknown): Promise<IntegrationItemView> {
    const parsed = disconnectIntegrationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid disconnect: ${parsed.error.message}`);
    }
    const provider = getProvider(parsed.data.providerKey);
    if (!provider) throw new IntegrationNotFoundError("Provider noma’lum");

    await integrationRepository.upsert({
      hotelId,
      providerKey: parsed.data.providerKey,
      category: provider.category,
      status: provider.requiresLicense ? "LICENSE_REQUIRED" : "DISCONNECTED",
      credentialsEnc: null,
      externalHotelId: null,
      meta: provider.defaultMeta,
      lastError: null,
      lastSyncAt: null,
    });

    const groups = await this.listGrouped(hotelId);
    const item = groups
      .flatMap((g) => g.items)
      .find((i) => i.providerKey === parsed.data.providerKey);
    if (!item) throw new IntegrationNotFoundError();
    return item;
  }

  /** Used by channel module — require CONNECTED OTA before sync. */
  async requireConnectedOta(
    hotelId: string,
    providerKey: string,
  ): Promise<{ externalHotelId: string | null; hasCredentials: boolean }> {
    const provider = getProvider(providerKey);
    if (!provider || provider.category !== "OTA") {
      throw new IntegrationNotFoundError("OTA provider emas");
    }
    const row = await integrationRepository.get(hotelId, providerKey);
    if (!row || row.status !== "CONNECTED") {
      throw new Error("OTA ulanmagan — avval integratsiyani ulang");
    }
    return {
      externalHotelId: row.externalHotelId,
      hasCredentials: Boolean(row.credentialsEnc),
    };
  }

  async markSync(
    hotelId: string,
    providerKey: string,
    opts: { ok: boolean; error?: string },
  ): Promise<void> {
    await integrationRepository.touchSync(hotelId, providerKey, opts);
  }
}

export const integrationService = new IntegrationService();
