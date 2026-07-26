# Step 2 backfill notes (binding once Step 2 starts)

**Not started.** Gates: Console SSH verify → restore passed → Step 1.5 hotfix → then this.

## Why not “PartnerEarning → LedgerTransaction”

Both derived stores are wrong in different ways. Source of truth = primary events.

## Phase 2a — Reclassification (misclassified but balanced)

Symptom: `BOOKING_PAYMENT` with no PARTNER credit; `assertBalanced` still passes because 100% gross → Platform Revenue.

For each recoverable tx (join booking → hotel → partner):

```
DEBIT  Platform Revenue   partnerNet
CREDIT Partner Payable    partnerNet
type: RECLASSIFICATION
originalTransactionId: <original>
idempotencyKey: reclass:<originalTxId>
```

Never UPDATE/DELETE `LedgerEntry`. Separate dry-run report: count, total_tiyin reclassed, unrecoverable (no partner join).

## Phase 2b — Missing events

Homestay/guide cancels, swallowed PartnerEarning reverses, payments never posted, etc. Build new txs from primary events. Separate dry-run vs PartnerEarning + current ledger.

## Call sites that wrote null partner (stop in 1.5)

- `lib/payments/completeSuccessfulPaymentTx.ts` — hardcoded `partnerUserId: null`
- `app/api/payme/methods/performTransaction.ts` — `partnerUserId: null`
