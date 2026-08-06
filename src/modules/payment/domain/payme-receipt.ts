/**
 * Payme fiscal receipt line items for CheckPerformTransaction `detail`.
 *
 * Shohjahon / Soliq: cheklar soliq oborotida ko‘rinishi uchun CheckPerform
 * javobida title, price (tiyin), count, code (MXIK), package_code, vat_percent
 * qaytarilishi shart. MXIK + package_code juftligini
 * https://tasnif.soliq.uz/attribute/<mxik> da tekshiring.
 */

export type PaymeReceiptItem = {
  title: string;
  price: number;
  count: number;
  code: string;
  package_code: string;
  vat_percent: number;
};

export type PaymeReceiptDetail = {
  receipt_type: number;
  items: PaymeReceiptItem[];
};

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/** MXIK — mehmonxona/turizm xizmati kodi; Soliq tasnifida tasdiqlang. */
export function getPaymeMxikCode(): string {
  return readEnv("PAYME_MXIK_CODE") ?? "00702001001000001";
}

/** O‘lchov birligi kodi — tanlangan MXIK ga bog‘langan bo‘lishi kerak. */
export function getPaymePackageCode(): string {
  return readEnv("PAYME_PACKAGE_CODE") ?? "123456";
}

export function getPaymeVatPercent(): number {
  const parsed = Number(readEnv("PAYME_VAT_PERCENT") ?? "12");
  return Number.isFinite(parsed) ? parsed : 12;
}

export function buildPaymeReceiptDetail(input: {
  title: string;
  /** Integer tiyin — Payme expects tiyin, never som. */
  priceTiyin: number;
  count?: number;
}): PaymeReceiptDetail {
  if (!Number.isInteger(input.priceTiyin) || input.priceTiyin <= 0) {
    throw new Error("Payme receipt price must be a positive integer tiyin amount");
  }
  const count = input.count ?? 1;
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("Payme receipt count must be a positive integer");
  }

  return {
    receipt_type: 0,
    items: [
      {
        title: input.title,
        price: input.priceTiyin,
        count,
        code: getPaymeMxikCode(),
        package_code: getPaymePackageCode(),
        vat_percent: getPaymeVatPercent(),
      },
    ],
  };
}
