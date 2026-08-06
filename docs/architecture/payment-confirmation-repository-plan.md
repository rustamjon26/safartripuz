# payment-confirmation.service.ts — repository migration plan

`src/modules/booking/service/payment-confirmation.service.ts` (633 lines) reaches
straight past the repository layer: **30 direct `tx.*` calls**, 29 Prisma model
calls plus one `$queryRaw`. It is also the single most dangerous file in the
codebase — it is what turns a Payme/Click webhook into confirmed bookings, ledger
entries and partner earnings.

This document is the initial pass asked for in item 5.3. **No code was changed.**
The recommendation is **4 sub-PRs**, sequenced safest first.

## Why not one PR

Three properties make a single sweep a bad trade:

1. Every call runs inside one Serializable transaction opened by the caller. Any
   repository method that quietly opens its own transaction, or that is called
   outside the `tx`, silently breaks atomicity — and the tests would still pass,
   because they mock the transaction client.
2. The existing tests mock `tx` as a hand-built object. Swapping a `tx.x.y()` for
   `repo.method(tx)` changes what the mock must provide, so a careless swap turns
   a real assertion into a vacuous one.
3. The failure mode is not a crash. It is a booking confirmed without a ledger
   entry, or a double partner earning — visible days later in reconciliation.

## Call-site inventory

| # | Lines | Group | What it does |
| --- | --- | --- | --- |
| 1 | 46, 54, 57, 66, 404, 414, 419 | **Payment + TravelPlan** | `SELECT … FOR UPDATE` on Payment, read payment/plan, set payment SUCCESS/PENDING_REVIEW, set plan CONFIRMED |
| 2 | 77, 107, 115 | **Hotel booking** | find pending hotel bookings for the plan, read hotel owner, stamp `payoutOwnerType` |
| 3 | 166, 186, 209, 214, 261, 277, 284 | **Homestay booking + availability** | find/confirm homestay bookings, read listing owner, create/link `HomeStayAvailability` |
| 4 | 296, 309, 332, 337, 387 | **Guide booking** | find/confirm guide bookings, read listing owner, write `GuideBookingLog` |
| 5 | 197, 320, 430, 441 | **Audit log** | four `auditLog.create` calls |
| 6 | 500, 536 | **Partner notification lookups** | read hotel / homestay listing purely to find who to notify |
| 7 | 607, 621 | **PartnerEarning** | idempotent find-then-create of the earning row |

## What already exists

`bookingRepository` (`src/modules/booking/repository/booking.repository.ts`)
already has `createAuditLog`, `findById`, `lockByIdForUpdate`, `create`,
`updateStatus`, `expireHeldIfDue`, `findExpiredHolds`,
`findExpiredHomestayHolds`. `bookingEventRepository` has `create`.
`paymentRepository` (exported from `@/src/modules/payment`) has
`findPaymentWithTravelPlanUser`, `updatePaymentFields`, `runTransaction`.

So group 5 needs **no new repository method at all**, and group 1 needs two.

## Proposed sub-PRs

### Sub-PR 1 — audit logs (group 5, 4 call sites)

Swap four `tx.auditLog.create(...)` for the existing
`bookingRepository.createAuditLog(..., tx)`. No new methods, no new queries, no
behaviour surface. This is the PR that proves the mocks survive the pattern; if
the existing suite needs edits here, the approach is wrong and everything below
should stop.

**Risk: minimal.**

### Sub-PR 2 — reads that only feed notifications (groups 6 + 2's hotel read, 3 call sites)

Lines 107, 500, 536 read a hotel or homestay listing to find an owner. Add
`bookingRepository.findHotelPayoutOwner(hotelId, tx)` and
`findHomestayPayoutOwner(listingId, tx)`. These are pure reads whose result only
selects a notification recipient and a `payoutOwnerType` stamp.

**Risk: low.** A wrong result means a missed notification, not wrong money.

### Sub-PR 3 — per-vertical booking confirmation (groups 2, 3, 4 — 13 call sites)

The three near-identical blocks that find pending bookings for a plan, confirm
them with a conditional `updateMany`, stamp `payoutOwnerType`, and write the
homestay availability / guide log rows.

Add to `bookingRepository`: `findPendingHotelBookingsForPlan`,
`findPendingHomestayBookingsForPlan`, `findPendingGuideBookingsForPlan`,
`confirmHomestayBookingIfPending`, `confirmGuideBookingIfPending`,
`stampPayoutOwnerType`, `upsertHomestayAvailabilityForBooking`,
`createGuideBookingLogs`.

The conditional `updateMany({ where: { status: "PENDING" } })` is the
double-confirm guard. It must stay a conditional update, and the caller must keep
branching on the returned count.

**Risk: medium.** Do the three verticals as three commits inside this PR so a
bisect lands on one vertical.

### Sub-PR 4 — payment row, plan row, partner earning (groups 1 + 7, 9 call sites)

Last because it holds the two hardest things:

- Line 46's `SELECT … FOR UPDATE` is the serialization point for concurrent
  webhooks. It must stay raw SQL inside the same transaction; a repository method
  wrapping it has to take `tx` and must never fall back to the default client.
- Lines 607/621 are a find-then-create with the uniqueness guarantee living in the
  DB constraint, not the read. Any repository method must keep both halves in the
  same transaction.

**Risk: high.** Worth its own PR with reconciliation run against a seeded DB
before and after.

## Rule for all four

The existing payment-confirmation suite must pass **unchanged**. If a test needs
editing, behaviour changed — stop and report rather than editing the test.

## What this does not address

The file's real problem is not only that it bypasses repositories: it is 633
lines doing hotel, homestay, guide, ledger, earnings, audit and notification work
in one function. Splitting it per vertical is a separate question from the
repository layering, and should be decided after sub-PR 3 shows what the seams
actually look like.
