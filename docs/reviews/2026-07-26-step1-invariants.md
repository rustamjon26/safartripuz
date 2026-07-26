# Step 1 — Machine-enforced invariants (2026-07-26)

## Changed

- `src/modules/inventory/service/inventory.service.ts` — no prisma; uses `inventoryRepository.runSerializable`
- `src/modules/inventory/repository/inventory.repository.ts` — `runSerializable`, `isRetryableInventoryLockError`
- `src/modules/payment/repository/payment.repository.ts` — payment find/update/tx + systemSetting
- `src/modules/payment/adapters/click/handler.ts` — repository only
- `src/modules/payment/adapters/payme/orderIdHandlers.ts` — repository only
- `src/modules/outbox/consumers/notification.consumer.ts` — `createInAppNotification` via repo
- `src/modules/outbox/repository/outbox.repository.ts` — notification create
- `src/modules/booking/repository/booking.repository.ts` — `findByIdAndHotelId`, `createAuditLog`
- `app/api/hotel/bookings/[id]/status/route.ts` — CANCELLED/REFUNDED → `cancelWithPolicy` (**P0 behaviour fix**)
- `lib/payments/providerConfig.ts` — no direct prisma
- `src/shared/money.ts` — branded `Tiyin`, `somToTiyin` / `tiyinToSom`
- `src/modules/ledger/domain/commission.ts` — returns branded `Tiyin`
- `eslint.config.mjs` — restricted prisma imports in `src/modules` + `lib/payments`; restrict som conversion helpers outside adapters/rates bridge
- `ARCHITECTURE.md` — Step 1 status

## Deliberately not changed

- ~160 `app/api` + remaining `lib/` prisma usage (tracked as 1.1 remaining)
- Full Money→Tiyin migration of all call sites (ledger + commission branded; adapters still use `Money.fromSomNumber`)
- Homestay/guide refund ledger reverse (Step 2)
- Ledger `partnerUserId: null` fix (Step 2)
- PartnerEarning float `calcCommission` (Step 2)

## Behaviour fix called out (not pure structural)

| Issue | Fix |
|-------|-----|
| HMS status PATCH cancel skipped policy/ledger | `cancelWithPolicy` for CANCELLED/REFUNDED |

## How to test

```bash
npm run lint
npm run typecheck
npm run test:unit
```

Manual: hotel manager cancel a CONFIRMED paid booking via HMS status → expect REFUNDED/CANCELLED per policy + inventory restore.

## Rollback

Revert this step's commits / files listed above. ESLint rules can be removed from `eslint.config.mjs` if blocking unrelated work.
