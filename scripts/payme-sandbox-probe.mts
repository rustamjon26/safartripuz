/**
 * Local probe of the Payme sandbox scenarios against OUR Merchant API handlers.
 *
 * This does NOT replace Payme's official песочница UI
 * (https://developer.help.paycom.uz/pesochnitsa) — that UI needs Merchant ID +
 * TEST_KEY from the cashbox and sends requests FROM Payme TO our Endpoint.
 *
 * What this script checks:
 *   - prod endpoints answer JSON-RPC and reject bad auth with -32504
 *   - local order_id CheckPerform returns fiscal detail (after PR #73)
 *
 * Usage:
 *   npx tsx scripts/payme-sandbox-probe.mts
 *   ENDPOINT=https://safartrip.uz/api/payments/webhook/payme npx tsx ...
 */

const ENDPOINT =
  process.env.ENDPOINT ?? "https://safartrip.uz/api/payments/webhook/payme";
const BOOKING_ENDPOINT =
  process.env.BOOKING_ENDPOINT ?? "https://safartrip.uz/api/payme";

type Rpc = {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: { code: number; message?: unknown; data?: unknown };
};

async function rpc(
  url: string,
  method: string,
  params: Record<string, unknown>,
  auth?: string,
): Promise<{ http: number; body: Rpc }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) headers.Authorization = `Basic ${auth}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as Rpc;
  return { http: res.status, body };
}

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function line(ok: boolean, label: string, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

async function main() {
  console.log("Payme sandbox probe");
  console.log(`  order_id endpoint : ${ENDPOINT}`);
  console.log(`  booking_id endpoint: ${BOOKING_ENDPOINT}`);
  console.log(`  checkout sandbox   : https://test.paycom.uz`);
  console.log("");

  let fails = 0;

  // Scenario from docs: wrong auth → -32504
  {
    const bad = b64("Paycom:not-the-real-test-key");
    const { http, body } = await rpc(
      ENDPOINT,
      "CheckPerformTransaction",
      { amount: 100, account: { order_id: "does-not-matter" } },
      bad,
    );
    const ok = http === 200 && body.error?.code === -32504;
    line(ok, "sandbox: bad auth → -32504", JSON.stringify(body.error ?? body.result));
    if (!ok) fails++;
  }

  // No auth → -32504
  {
    const { http, body } = await rpc(ENDPOINT, "CheckPerformTransaction", {
      amount: 100,
      account: { order_id: "x" },
    });
    const ok = http === 200 && body.error?.code === -32504;
    line(ok, "sandbox: missing auth → -32504", JSON.stringify(body.error ?? body.result));
    if (!ok) fails++;
  }

  // booking_id stack same auth contract
  {
    const { http, body } = await rpc(BOOKING_ENDPOINT, "CheckPerformTransaction", {
      amount: 100,
      account: { booking_id: "x" },
    });
    const ok = http === 200 && body.error?.code === -32504;
    line(ok, "booking_id: missing auth → -32504", JSON.stringify(body.error ?? body.result));
    if (!ok) fails++;
  }

  // Without TEST_KEY we cannot pass CheckPerform with a real order — report blocker.
  const hasTestKey = Boolean(
    process.env.PAYME_TEST_SECRET_KEY || process.env.PAYME_SANDBOX_TEST_KEY,
  );
  if (!hasTestKey) {
    line(
      false,
      "sandbox: full CheckPerform/Create/Perform/Cancel",
      "BLOCKED — no PAYME_TEST_SECRET_KEY / Merchant TEST_KEY in this environment",
    );
    fails++;
    console.log(`
To finish the official песочница scenarios you need from Shohjahon / Payme cabinet:
  1. Merchant ID (web-kassa)
  2. TEST_KEY (песочница key — not the production key)
  3. Endpoint URL set on the kassa to:
       ${ENDPOINT}
  4. Then open https://test.paycom.uz (or the песочница UI), enter Merchant ID + TEST_KEY,
     and run scenario 1 then scenario 2 from the docs.
`);
  } else {
    const key = process.env.PAYME_TEST_SECRET_KEY || process.env.PAYME_SANDBOX_TEST_KEY!;
    const auth = b64(`Paycom:${key}`);
    const orderId = process.env.PAYME_PROBE_ORDER_ID;
    const amount = Number(process.env.PAYME_PROBE_AMOUNT_TIYIN || "0");
    if (!orderId || !amount) {
      line(
        false,
        "sandbox: CheckPerform with TEST_KEY",
        "SET PAYME_PROBE_ORDER_ID and PAYME_PROBE_AMOUNT_TIYIN (tiyin)",
      );
      fails++;
    } else {
      const { body } = await rpc(
        ENDPOINT,
        "CheckPerformTransaction",
        { amount, account: { order_id: orderId } },
        auth,
      );
      const detail = (body.result as { detail?: { items?: unknown[] } } | undefined)?.detail;
      const ok =
        body.result != null &&
        (body.result as { allow?: boolean }).allow === true &&
        Array.isArray(detail?.items) &&
        detail!.items!.length > 0;
      line(
        ok,
        "sandbox: CheckPerform allow+detail",
        JSON.stringify(body.result ?? body.error),
      );
      if (!ok) fails++;
    }
  }

  console.log("");
  console.log(fails === 0 ? "ALL PROBES PASSED" : `PROBES FINISHED WITH ${fails} ISSUE(S)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
