# The three booking-creation paths — comparison and proposed target

Item 5.4 asks for a written comparison before any merge code. **No code was
changed.** This needs a design decision, listed at the end.

## The paths

| | (a) `bookingService` | (b) `lib/hotel/createQuickBooking` | (c) inline route transactions |
| --- | --- | --- | --- |
| Entry | `app/api/hotels/bookings`, `app/api/travel-plans`, `app/api/hotel/bookings` | `app/api/hotels/[id]/bookings` | `app/api/homestay/bookings`, `app/api/guide/bookings`, `app/api/travel-plans` |
| Verticals | hotel only | hotel only | homestay, guide |
| Isolation | Serializable + 3 retries | inherited from (a) | Serializable wrapper, except the trip-builder homestay leg |
| Locking | `Inventory` rows `FOR UPDATE` per night | inherited | `HomeStayListing` / `GuideListing` `FOR UPDATE` |
| Availability store | `Inventory` table | `Inventory` table | `HomeStayAvailability` / `GuideBlockedSlot` |
| Physical room | only if `assignPhysicalRoomId` given | yes, under `FOR UPDATE` with clash check | n/a |
| Price | **trusts the caller** | **computes** via `ratesService.quoteHotel` | **computes**, and rejects client drift |
| Audit trail | `BookingEvent` | `BookingEvent` (via a) | `AuditLog` / `GuideBookingLog` — no `BookingEvent` |
| Statuses | `HELD` or `CONFIRMED` | `CONFIRMED` | `PENDING` |
| Hold TTL | 15 min on `HELD` | none | 15 min homestay; **guide has none** |
| Outbox | `createConfirmedHotelBooking` only | not reached (no `guestUserId`) | none |
| TravelPlan | caller attaches after | none | created or reused inside the transaction |
| Idempotency | none | none | none |

## Why they diverged

Reading the history rather than guessing:

1. **(a) came last.** The inventory module and its Serializable reserve/release
   were built for the hotel vertical, so only hotel creation was moved into a
   service. Homestay and guide were already shipping and were left where they
   were.
2. **(b) exists because (a) trusts its caller on price.** The front desk had no
   price to trust, so quick-book quotes first and then delegates. That is the
   right shape — it is the *other* reception route, `app/api/hotel/bookings`,
   that is wrong.
3. **(c) is not one path, it is three.** Standalone homestay, standalone guide,
   and the trip-builder legs each grew separately, which is why the trip-builder
   guide leg writes a `TravelPlanItem` and **no `GuideBooking` at all**, while the
   standalone guide route writes one.

## Behavioural gaps worth naming

These are consequences of the divergence, not merge blockers, but a merge should
fix rather than preserve them:

- **Two reception paths, two levels of safety.** `createQuickBooking` assigns the
  physical room inside the Serializable transaction with a `FOR UPDATE` and a
  clash check. `app/api/hotel/bookings` assigns rooms *after* the transaction with
  `createMany` and no clash guard.
- **Guide bookings have no hold TTL.** `GuideBooking` has no `holdExpiresAt`
  column, so an abandoned `PENDING` guide booking blocks its slot until the cron
  cancels it by tour date.
- **The trip-builder homestay leg runs at Read Committed**, not Serializable like
  every other availability write.
- **No path is idempotent.** A retried POST creates a second booking everywhere.
- **`BookingEvent` only covers hotel.** Homestay and guide write to different
  tables, so there is no one place to answer "what happened to this booking".

## Proposed target design

One service surface per vertical behind the booking module, with the shared parts
factored out rather than copy-pasted:

```
bookingService
  .createHotelBooking({ mode: "hold" | "confirm", … })
  .createHomestayBooking({ … })
  .createGuideBooking({ … })
```

Each built from four shared steps, so a change to any one lands everywhere:

1. **Quote** — always server-side. The service takes `expectedTotal` at most and
   rejects drift; it never accepts a price. This removes (a)'s "trusts caller",
   which is the single largest behavioural difference.
2. **Reserve** — one `availability` port with a per-vertical adapter: `Inventory`
   rows for hotel, `HomeStayAvailability` for homestay, `GuideBlockedSlot` for
   guide. All under `withSerializableRetry`.
3. **Persist** — booking row plus a `BookingEvent` for every vertical, so the
   audit trail stops depending on which table you happen to know about.
4. **Announce** — outbox enqueue inside the transaction, for every vertical.

Plus two things none of the paths have today:

- **A hold TTL on every vertical**, which needs a `holdExpiresAt` column on
  `GuideBooking`.
- **An idempotency key** on create, so a retried webhook or double-tapped button
  cannot produce a second booking.

## Sequencing, if approved

1. Add `BookingEvent` writes to the homestay and guide paths where they are —
   no behaviour change, but it makes the later move observable.
2. Move server-side pricing into `bookingService.createHotelBooking` and delete
   the caller-supplied total. Fixes `app/api/hotel/bookings` on the way.
3. Move the standalone homestay route's transaction into the module behind
   `createHomestayBooking`, unchanged.
4. Same for guide, adding `holdExpiresAt`.
5. Repoint the trip-builder legs at the module methods, which removes the Read
   Committed homestay leg and gives the guide leg a real booking row.
6. Add idempotency keys once all five callers go through one surface.

## Decision needed before step 2

Step 2 changes the contract of a public service method: `totalAmount` stops being
an input. Two callers pass one today (`app/api/hotel/bookings` and the
trip-builder hotel leg, which already computes a verified total). Confirm that
server-side pricing is the intent for **all** hotel creation, including OTA
reservations arriving through the channel module, before this starts — an OTA
reservation arrives with a price already agreed with the guest, and may need to
be an explicit exception rather than a rejected drift.
