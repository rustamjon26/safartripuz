# Step 0 — Reality check (2026-07-26)

No production code changed. Scan of `@codebase` vs [`ARCHITECTURE.md`](../../ARCHITECTURE.md) checklist.

## Summary table

| Item | Checklist says | Reality | Gap | Severity |
|------|----------------|---------|-----|----------|
| Repo layer booking/inventory/payment | Partial | Repos exist under `src/modules/{booking,inventory,payment,ledger,rates,outbox}/repository/`. Runtime Prisma still in `inventory.service.ts`, payment adapters (`click/handler.ts`, `payme/orderIdHandlers.ts`), `outbox/consumers/notification.consumer.ts`. **~160+** `app/api` + **~30** `lib/` still import `@/lib/prisma`. | Money modules half-migrated; rest of product not started | P1 |
| Booking SM | Done | Core path via `BookingService.transition` + `assertTransition`. Bypass: raw SQL EXPIRE in `booking.repository.ts`; HMS cancel via `app/api/hotel/bookings/[id]/status/route.ts` can `transition(CANCELLED)` **without** `cancelWithPolicy` | Refund/ledger skip on staff cancel | **P0** |
| Holds / double-book | Done | Serializable reserve + expire holds exist; integration tests present | Staging watch still advised | P2 |
| Payment idempotency | Done | `ProcessedEvent` `@@unique([provider, providerEventId])` (`prisma/schema.prisma`); `PaymentTransaction.idempotencyKey` `@unique`. WebhookLog append-only (no unique — OK). | Dedup is DB-enforced for ProcessedEvent | — |
| Network inside `$transaction` | Should be none | No Payme/Click/Didox/Expo HTTP inside txs found; outbox enqueue-in-tx is correct | Keep enforcing | — |
| Rate engine | Done | Pure bigint pipeline + service wire | Som↔tiyin still via `Money` outside adapters in rates service/repo | P1 |
| Cancellation engine | Done | `computeRefund` + `cancelWithPolicy` for hotel | Homestay/guide cancel compute refund only (no ledger/earning); PartnerEarning reverse swallows errors | **P0** |
| Outbox | Done | Enqueue in payment success tx; relay/PM2/cron | Consumer uses `@/lib/prisma` | P2 |
| Ledger | Minimal | `assertBalanced` on post/refund; payment success often `partnerUserId: null` → all credit platform; PartnerEarning still float `calcCommission` dual-write | Ledger ≠ PartnerEarning by design today | **P0** |
| PartnerEarning reads | Still | Writes in `lib/payments/completeSuccessfulPaymentTx.ts`; reads in hotel earnings + admin revenue | Cutover blocked until dual-write/compare clean | P1 |
| Reconciliation | Pending | Not found | Need Step 3 | P1 |
| Money types | Mixed | Schema mostly `Decimal` SOM; tiyin `BigInt` on ledger/rates/PaymentTransaction. Float: `lib/getCommissionRates.ts` `calcCommission`, taxi `* 0.15` | Dual stack | **P0** |
| Tests/CI/Sentry | Done | Vitest money suites + CI + Sentry/request-id | No recon/ledger dual-write/integration for clawback drift | P1 |
| Backup automation | Pending | Manual only | Step 5 + **manual restore before Step 2** | **P0 ops** |

## Detail notes

### 1. Repository layer

**Have `repository/`:** booking, inventory, payment, ledger, rates, outbox.

**Half-migrated (Prisma outside repository):**

- `src/modules/inventory/service/inventory.service.ts` — runtime prisma
- `src/modules/payment/adapters/click/handler.ts` — `@/src/shared/db/prisma`
- `src/modules/payment/adapters/payme/orderIdHandlers.ts` — same
- `src/modules/outbox/consumers/notification.consumer.ts` — `@/lib/prisma`

**Not started:** ~160 `app/api/**` routes + ~30 `lib/**` helpers (hotel HMS, admin, taxi, guide, homestay, auth).

### 2. Money

- Schema: almost all booking/payment amounts are `Decimal` (SOM). Tiyin `BigInt` on `LedgerEntry`, rates tables, `PaymentTransaction.amountTiyin`.
- Float commission: `lib/getCommissionRates.ts` (`toFixed(2)`); taxi driver complete `finalPrice * 0.15`.
- `Money.fromSomNumber` / `toSomNumber` used outside payment adapters: `completeSuccessfulPaymentTx.ts`, `booking.service.ts` (cancel), homestay/guide cancel routes, `rates` service/repository.

### 3. Ledger vs PartnerEarning

- Ledger: `postBookingPayment` / `record` / `postRefundCompensation`; `assertBalanced` before create.
- Payment success ledger often `partnerUserId: null` → gross → platform revenue (skew vs PartnerEarning partner net).
- PartnerEarning still written on payment success; reversed (partially) on hotel `cancelWithPolicy` only; empty `catch` can leave drift.

### 4. Booking status bypasses

- Raw SQL expire → `EXPIRED` (intentional for holds).
- `app/api/hotel/bookings/[id]/status/route.ts` — CANCELLED/REFUNDED without `cancelWithPolicy` (**P0**).
- Homestay/guide confirm via `updateMany` in payment tx (separate enums, not hotel SM).

### 5. Payment / transactions

- Dedup: UNIQUE on `ProcessedEvent` — real.
- No provider HTTP inside `$transaction`; Didox/push via outbox after commit.

### 6. Cancel / refund drift

- Hotel `cancelWithPolicy`: ledger refund + PartnerEarning reverse when `refundTiyin > 0`.
- Homestay/guide: refund % computed, **no** ledger / earning reverse.
- Staff status cancel can skip policy entirely.

### 7. Tests present

`booking.state`, `refund.policy`, `pricing.pipeline`, `commission`, `ledger.invariant`, Click/Payme webhook contracts, `money`, nights, inventory concurrency + hold expiry integration, outbox unit.

**Missing:** ledger↔earning equality, `partnerUserId: null` shape, HMS cancel-without-policy, homestay/guide refund accounting, provider statement recon, backup scripts.

## Ops gate (before Step 2)

Manual verified restore required (dump → off-site → restore_test → COUNTs). Sinalmagan backup — backup emas.

## Changed in this step

- Added this report.
- Updated `ARCHITECTURE.md` reality notes.

## Deliberately not changed

- All application / schema / payment code.

## How to test / rollback

- N/A (docs only). Rollback: delete this file / revert ARCHITECTURE.md edit.
