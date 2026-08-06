# Payme `booking_id` RPC → payment module

Item 5.7. Payme runs two stacks in this codebase:

- **`order_id`** (`/api/payments/webhook/payme`) — already module-based, goes
  through `paymentRepository` and `orderIdHandlers.ts`.
- **`booking_id`** (`/api/payme`) — the legacy stack: six method files under
  `app/api/payme/methods/` reaching into `@/lib/prisma` directly.

The dispatcher (`src/modules/payment/adapters/payme/httpHandler.ts`) was already
in the module; only the method bodies were outside it.

## Done in this PR — the three read-only methods

| Method | Now at | Prisma access |
| --- | --- | --- |
| `CheckPerformTransaction` | `adapters/payme/bookingId/checkPerformTransaction.ts` | `paymeBookingRepository` |
| `CheckTransaction` | `adapters/payme/bookingId/checkTransaction.ts` | `paymeBookingRepository` |
| `GetStatement` | `adapters/payme/bookingId/getStatement.ts` | `paymeBookingRepository` |

New `src/modules/payment/repository/payme-booking.repository.ts` owns the
`Booking` + `PaymeTransaction` reads for this stack. `app/api/payme/utils/helpers.ts`
also lost its three direct Prisma calls to the same repository, so the remaining
legacy method files now have no Prisma of their own except their own writes.

The migrated methods use the canonical `PAYME_ERRORS` keys instead of the
aliases in `app/api/payme/utils/errors.ts`. The aliases pointed at the same
objects, so the wire codes are unchanged:

| Legacy alias | Canonical | Code |
| --- | --- | --- |
| `ORDER_NOT_FOUND` | `TRANSACTION_NOT_FOUND` | -31003 |
| `TRANSACTION_CANCELLED` | `TRANSACTION_NOT_FOUND` | -31003 |
| `AMOUNT_MISMATCH` | `WRONG_AMOUNT` | -31001 |
| `SYSTEM_ERROR` | `INTERNAL` | -32400 |

13 tests cover every branch of the three methods, including the amount checks
and the 12-hour auto-cancel, because Payme scores a merchant on exact codes.

## Not done — the three write methods

`CreateTransaction` (122 lines), `PerformTransaction` (150) and
`CancelTransaction` (134) are still in `app/api/payme/methods/`.

**They are blocked on verification, not on effort.** The brief asks to "verify
against Payme sandbox tests after each method". There is no runnable sandbox
suite in this repo:

- `scripts/test-payme.ts` and `scripts/test-payme-auth.sh` need a live server and
  real merchant credentials.
- The unit tests (`payme-auth.test.ts`, `payme.webhook.test.ts`,
  `httpHandler.cache.test.ts`) cover auth, error codes and the idempotency cache
  — not the money mutations these three perform.

These three do not just read: `PerformTransaction` posts ledger entries and
partner earnings, `CancelTransaction` runs `postCancelAccountingInTx`. Moving
them without being able to replay a sandbox transaction means the first
verification would be a real payment.

## To finish them

One PR per method, in this order (least to most coupled):

1. **`CreateTransaction`** — writes a `PaymeTransaction` row and nothing else.
   Needs `paymeBookingRepository.createTransaction` plus the existing
   `$transaction` boundary preserved.
2. **`CancelTransaction`** — needs the accounting reversal to stay inside the
   same transaction as the state change.
3. **`PerformTransaction`** — the ledger + `PartnerEarning` dual write; do last
   and reconcile before and after.

Each needs a sandbox run against Payme's test merchant before merge. If that is
not available, the alternative is an integration test that drives the real
handler against the test database with a seeded `Booking`, asserting the ledger
and `PartnerEarning` rows afterwards — slower to write, but it is verification
that lives in CI rather than in someone's terminal.
