/**
 * Single-line structured log for Click Shop API Prepare/Complete.
 * Safe to paste into Click support: no secret key, no card data.
 */
export type ClickShopLog = {
  ts: string;
  channel: "click-shop";
  phase: "prepare" | "complete" | "unknown";
  path: string;
  click_trans_id: string | number | null;
  merchant_trans_id: string | null;
  merchant_prepare_id?: string | number | null;
  amount: string | number | null;
  action: string | number | null;
  inbound_error: number | null;
  signature_ok: boolean | null;
  response_error: number;
  response_error_note: string;
};

export function clickShopTimestamp(): string {
  return new Date().toISOString();
}

export function logClickShop(entry: ClickShopLog): void {
  console.info("[click-shop]", JSON.stringify(entry));
}
