/**
 * Zero-dep P0 contract + inlined commission checks.
 * node --experimental-strip-types scripts/p0-ledger-check.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

function ok(name: string): void {
  console.log("PASS", name);
}

function calcPlatformCommissionTiyin(
  grossTiyin: bigint,
  ratePercent: number,
): { platformTotal: bigint; partnerNet: bigint } {
  const rate = BigInt(Math.floor(ratePercent));
  const platformTotal = (grossTiyin * rate) / 100n;
  return { platformTotal, partnerNet: grossTiyin - platformTotal };
}

function splitBookingCommission(grossTiyin: bigint) {
  const { platformTotal, partnerNet } = calcPlatformCommissionTiyin(grossTiyin, 10);
  const bookingFee = (grossTiyin * 5n) / 100n;
  const hmsFee = platformTotal - bookingFee;
  return { bookingFee, hmsFee, platformTotal, partnerNet };
}

const r = splitBookingCommission(1_000_000n);
assert.equal(r.platformTotal, 100_000n);
assert.equal(r.partnerNet, 900_000n);
assert.equal(r.bookingFee + r.hmsFee, r.platformTotal);
ok("splitBookingCommission 10%");

const g = calcPlatformCommissionTiyin(1_000_000n, 15);
assert.equal(g.platformTotal, 150_000n);
assert.equal(g.partnerNet, 850_000n);
ok("calcPlatformCommissionTiyin 15%");

const root = process.cwd();

function mustMatch(rel: string, re: RegExp): void {
  const src = readFileSync(join(root, rel), "utf8");
  assert.match(src, re);
  ok(`contract ${rel}`);
}

function mustNotMatch(rel: string, re: RegExp, label: string): void {
  const src = readFileSync(join(root, rel), "utf8");
  assert.doesNotMatch(src, re);
  ok(label);
}

mustMatch("src/modules/commission/domain/commission.ts", /calcPlatformCommissionTiyin/);
mustMatch("src/modules/ledger/domain/types.ts", /CLAWBACK/);
mustMatch("src/modules/ledger/service/ledger.service.ts", /MissingPartnerError/);
mustMatch("src/modules/ledger/service/ledger.service.ts", /UNATTRIBUTED/);
mustMatch("src/modules/ledger/service/ledger.service.ts", /allowUnattributed/);
mustMatch("app/api/hotel/bookings/[id]/status/route.ts", /cancelWithPolicy/);
mustMatch("app/api/homestay/bookings/[id]/route.ts", /postCancelAccountingInTx/);
mustMatch("app/api/guide/bookings/[id]/route.ts", /postCancelAccountingInTx/);
mustMatch("app/api/guide/partner/bookings/[id]/route.ts", /postCancelAccountingInTx/);
mustMatch("app/api/taxi/driver/orders/[id]/route.ts", /calcPlatformCommissionTiyin/);
mustMatch(
  "src/modules/booking/service/payment-confirmation.service.ts",
  /payment:\$\{paymentId\}:booking:/,
);
mustMatch("src/modules/commission/index.ts", /calcPlatformCommissionTiyin/);
mustMatch("eslint.config.mjs", /Float money banned/);
// Hotel earnings read the ledger through this helper, not in the route.
mustMatch("lib/earnings/loadPartnerEarningsHybrid.ts", /getPartnerBalanceSummary/);
mustMatch("lib/earnings/loadPartnerEarningsHybrid.ts", /source:\s*"ledger"/);
mustMatch("app/api/admin/payments/revenue/route.ts", /sumPlatformRevenueTiyin/);
mustMatch("app/api/admin/payments/revenue/route.ts", /source:\s*"ledger\+partner_earning"/);
mustMatch("app/api/payme/methods/performTransaction.ts", /partnerUserId/);

mustNotMatch(
  "app/api/taxi/driver/orders/[id]/route.ts",
  /\*\s*0\.15/,
  "taxi no *0.15",
);
mustNotMatch(
  "app/api/taxi/driver/orders/[id]/route.ts",
  /\.toFixed\(/,
  "taxi no toFixed",
);
mustNotMatch(
  "src/modules/booking/service/payment-confirmation.service.ts",
  /partnerUserId:\s*null/,
  "payment success no null partner",
);
mustNotMatch(
  "src/modules/booking/service/payment-confirmation.service.ts",
  /calcCommission\(/,
  "payment success no float calcCommission",
);
mustNotMatch(
  "app/api/payme/methods/performTransaction.ts",
  /partnerUserId:\s*null/,
  "legacy payme no null partner",
);

{
  const bookingSvc = readFileSync(
    join(root, "src/modules/booking/service/booking.service.ts"),
    "utf8",
  );
  const idx = bookingSvc.indexOf("async reversePartnerEarning");
  assert.ok(idx > 0);
  assert.doesNotMatch(bookingSvc.slice(idx, idx + 1500), /catch\s*\{\s*\}/);
  ok("reversePartnerEarning fail-loud");
}

console.log("\nAll P0 ledger checks passed.");
