export type PaymeCheckoutOptions = {
  bookingId: string;
  amount: number;
  lang?: "ru" | "uz" | "en";
  callbackUrl?: string;
  description?: string;
};

export type PaymeCheckoutDetailItem = {
  title: string;
  price: number;
  count: number;
  code: string;
  package_code: string;
  vat_percent: number;
};

export type PaymeCheckoutDetail = {
  receipt_type: number;
  items: PaymeCheckoutDetailItem[];
};

function readPublicEnv(name: string): string {
  if (typeof process !== "undefined" && process.env[name]) {
    return process.env[name] ?? "";
  }
  return "";
}

export function isPaymeTestMode(): boolean {
  return readPublicEnv("NEXT_PUBLIC_PAYME_IS_TEST") === "true" || readPublicEnv("PAYME_IS_TEST") === "true";
}

export function getPaymeCheckoutBaseUrl(): string {
  return isPaymeTestMode() ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
}

export function getPaymeMerchantId(): string {
  return readPublicEnv("NEXT_PUBLIC_PAYME_MERCHANT_ID") || readPublicEnv("PAYME_MERCHANT_ID");
}

function encodePaymeParams(params: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(params, "utf8").toString("base64");
  }

  return btoa(params);
}

function encodeDetail(detail: PaymeCheckoutDetail): string {
  return encodePaymeParams(JSON.stringify(detail));
}

function resolveCallbackUrl(bookingId: string, callbackUrl?: string): string {
  if (callbackUrl) return callbackUrl;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/bookings/${bookingId}?status=success`;
  }

  const appUrl = readPublicEnv("NEXT_PUBLIC_APP_URL") || readPublicEnv("APP_URL");
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/bookings/${bookingId}?status=success`;
  }

  return `/bookings/${bookingId}?status=success`;
}

export function buildPaymeCheckoutParams(options: PaymeCheckoutOptions): string {
  const merchantId = getPaymeMerchantId();
  const callback = resolveCallbackUrl(options.bookingId, options.callbackUrl);
  const lang = options.lang ?? "uz";

  const parts = [
    `m=${merchantId}`,
    `ac.booking_id=${options.bookingId}`,
    `a=${options.amount}`,
    `c=${callback}`,
    `l=${lang}`,
  ];

  if (options.description) {
    parts.push(`d=${options.description}`);
  }

  return parts.join(";");
}

export function buildPaymeCheckoutUrl(options: PaymeCheckoutOptions): string {
  const encoded = encodePaymeParams(buildPaymeCheckoutParams(options));
  return `${getPaymeCheckoutBaseUrl()}/${encoded}`;
}

export function initiatePaymePayment(bookingId: string, amount: number): void {
  if (typeof window === "undefined") {
    throw new Error("initiatePaymePayment must be called in the browser");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Amount must be a positive integer in tiyin");
  }

  const url = buildPaymeCheckoutUrl({ bookingId, amount });
  window.location.href = url;
}

export function submitPaymeCheckoutPost(options: PaymeCheckoutOptions & { detail?: PaymeCheckoutDetail }): void {
  if (typeof document === "undefined") {
    throw new Error("submitPaymeCheckoutPost must be called in the browser");
  }

  if (!Number.isInteger(options.amount) || options.amount <= 0) {
    throw new Error("Amount must be a positive integer in tiyin");
  }

  const merchantId = getPaymeMerchantId();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = getPaymeCheckoutBaseUrl();
  form.style.display = "none";

  const appendField = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  appendField("merchant", merchantId);
  appendField("amount", String(options.amount));
  appendField("account[booking_id]", options.bookingId);
  appendField("lang", options.lang ?? "uz");
  appendField("callback", resolveCallbackUrl(options.bookingId, options.callbackUrl));

  if (options.description) {
    appendField("description", options.description);
  }

  if (options.detail) {
    appendField("detail", encodeDetail(options.detail));
  }

  document.body.appendChild(form);
  form.submit();
}

export function buildDefaultHotelReceiptDetail(
  hotelName: string,
  amountTiyin: number,
  mxikCode = "00702001001000001",
  packageCode = "123456",
  vatPercent = 12,
): PaymeCheckoutDetail {
  return {
    receipt_type: 0,
    items: [
      {
        title: `Hotel booking - ${hotelName}`,
        price: amountTiyin,
        count: 1,
        code: mxikCode,
        package_code: packageCode,
        vat_percent: vatPercent,
      },
    ],
  };
}
