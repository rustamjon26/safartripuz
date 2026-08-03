import type { IntegrationCategory, ProviderDefinition } from "./types";

/** Static provider catalog — add new OTAs here without migrations. */
export const PROVIDER_CATALOG: readonly ProviderDefinition[] = [
  {
    key: "booking",
    name: "Booking.com",
    category: "OTA",
    desc: "Global bron tizimi bilan xona holati va narxlarni avtomatik yangilang.",
    badges: ["API", "XML"],
    defaultMeta: "Ulanmagan",
  },
  {
    key: "expedia",
    name: "Expedia",
    category: "OTA",
    desc: "Shimoliy Amerika va Yevropa bozorlariga kirish uchun Expedia tarmog‘iga ulaning.",
    badges: ["API"],
    defaultMeta: "Ulanmagan",
  },
  {
    key: "airbnb",
    name: "Airbnb",
    category: "OTA",
    desc: "Turistik uylar va kvartiralar uchun global platforma integratsiyasi.",
    badges: ["API"],
    requiresLicense: true,
    defaultMeta: "Litsenziya talab etiladi",
  },
  {
    key: "payme",
    name: "Payme Business",
    category: "PAYMENT",
    desc: "Mahalliy kartalar orqali to‘lovlar va avtomatik fiskal chek.",
    defaultMeta: "Platforma sozlamasi",
  },
  {
    key: "click",
    name: "Click Evolution",
    category: "PAYMENT",
    desc: "QR-kod va billing orqali to‘lovlarni boshqarish.",
    defaultMeta: "Platforma sozlamasi",
  },
  {
    key: "uzum",
    name: "Uzum Bank",
    category: "PAYMENT",
    desc: "Uzum ekotizimi orqali to‘lov yechimlari va keshbek.",
    defaultMeta: "Yangi xizmat",
  },
  {
    key: "yandex",
    name: "Yandex Go Business",
    category: "LOCAL",
    desc: "Mehmonlar uchun transfer bron qilish va korporativ hisob.",
    defaultMeta: "Ulanmagan",
  },
  {
    key: "guides",
    name: "Silk Road Guides",
    category: "LOCAL",
    desc: "Professional gidlar tarmog‘i va ekskursiyalar buyurtmasi.",
    defaultMeta: "Hamkorlik mavjud",
  },
] as const;

export function getProvider(key: string): ProviderDefinition | undefined {
  return PROVIDER_CATALOG.find((p) => p.key === key);
}

export function providersByCategory(
  category?: IntegrationCategory | "all",
): ProviderDefinition[] {
  if (!category || category === "all") return [...PROVIDER_CATALOG];
  return PROVIDER_CATALOG.filter((p) => p.category === category);
}

/** Platform payment gateways — status can be inferred from env when no row. */
export function paymentEnvConnected(providerKey: string): boolean {
  if (providerKey === "payme") {
    return Boolean(
      process.env.PAYME_MERCHANT_ID || process.env.PAYME_LOGIN,
    );
  }
  if (providerKey === "click") {
    return Boolean(
      process.env.CLICK_MERCHANT_ID || process.env.CLICK_SERVICE_ID,
    );
  }
  return false;
}
