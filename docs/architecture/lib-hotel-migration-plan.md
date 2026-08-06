# `lib/hotel/*` → modules — migration plan

Item 5.6 asks for a plan only. **No code was changed.**

## What is actually there

19 TypeScript files under `lib/hotel/` and `lib/hotel/reports/`, plus the
`lib/hotel.ts` barrel that holds the hotel-context helpers.

Route coupling, measured rather than assumed:

| Import | Distinct `app/api/**/route.ts` files |
| --- | --- |
| `@/lib/hotel/<file>` | 16 |
| `@/lib/hotel` (the barrel) | 22 |
| **Union** | **37** |

The brief said 39; the current tree is 37. Close enough that the shape of the
problem is unchanged, but the plan below is sized against 37.

16 of the 19 production files import `@/lib/prisma` directly.

## Where each file belongs

### Already has an owning module — move, do not redesign

| File | Lines | Target |
| --- | --- | --- |
| `getBookingDetail.ts` | 236 | **booking** |
| `listHotelBookings.ts` | 188 | **booking** |
| `updateBookingStatus.ts` | 117 | **booking** (already delegates to `bookingService.transition`) |
| `updateBookingGuest.ts` | 77 | **booking** + guest |
| `createQuickBooking.ts` | 142 | **booking** (see the booking-paths doc — it becomes a service method) |
| `bulkCreateRooms.ts` | 169 | **inventory** |
| `bulkUpdateRoomStatus.ts` | 108 | **inventory** |
| `previewRoomNumbers.ts` | 24 | **inventory** (pure, no I/O — easiest file in the set) |
| `roomTypeSchema.ts` | 69 | **rates** (room type is the pricing unit) |
| `assertHotelAccess.ts` | 32 | **staff** (it is an access-control helper over hotel context) |

### Needs a home that does not exist yet

| File | Lines | Note |
| --- | --- | --- |
| `hotelGuestService.ts` | 413 | The architecture doc lists a **guest** module; `src/modules/guest` does not exist. This file *is* that module. |
| `hotelGuestSchema.ts` | 49 | Same. |

### Genuinely hotel-specific reporting — needs a new module

| File | Lines | Note |
| --- | --- | --- |
| `getHotelDashboardStats.ts` | 222 | Occupancy/arrivals/revenue aggregation |
| `getHotelFinanceAnalytics.ts` | 357 | Finance page aggregation |
| `getHotelReports.ts` | 437 | Report datasets |
| `getCalendarData.ts` | 228 | Calendar grid |

These read across booking, inventory and payment. Scattering them into those
modules would create exactly the cross-module Prisma joins the architecture rule
forbids. They want their own **`hms-reporting`** module that composes the others
through their `index.ts`, per the "compose in the service layer" rule.

### Not hotel logic at all

| File | Lines | Note |
| --- | --- | --- |
| `reports/generateReportExcel.ts` | 328 | XLSX formatting — no Prisma |
| `reports/generateReportPdf.tsx` | 417 | PDF rendering — no Prisma |

Presentation adapters. They belong under `src/shared/reporting/` or stay put;
either way they are not blocking anything.

### The barrel

`lib/hotel.ts` (`getApprovedHotelContextByUserId`,
`ensureApprovedHotelManagerSetup`) is imported by 22 routes and is the
highest-fan-in file in the set. It resolves "which hotel is this user allowed to
act on" — that is **staff/partner context**, not hotel data.

## Proposed sequencing

Smallest and safest first. Each step is one PR.

**1. `previewRoomNumbers.ts` → inventory.** 24 lines, pure functions, zero route
importers (only a React component). This is the rehearsal: it proves the move
pattern and the import rewrite without touching a request path.

**2. Room operations → inventory.** `bulkCreateRooms`, `bulkUpdateRoomStatus`,
`roomTypeSchema`. 4 routes. Self-contained writes with no booking coupling.

**3. Create `src/modules/guest`.** Move `hotelGuestService` and
`hotelGuestSchema` in as `{domain,repository,service,index}`. 2 routes. This adds
the module the architecture doc already claims exists, and it is the largest
single file (413 lines) with the smallest blast radius.

**4. Booking reads → booking module.** `getBookingDetail`, `listHotelBookings`.
4 routes. Reads only, so a mistake shows up as a broken list rather than a broken
booking.

**5. Booking writes → booking module.** `updateBookingStatus`,
`updateBookingGuest`, `createQuickBooking`. 4 routes. Do this **after** the
booking-paths decision in `booking-creation-paths.md`, because
`createQuickBooking` becomes a service method there rather than a moved file.

**6. Create `src/modules/hms-reporting`.** `getHotelDashboardStats`,
`getHotelFinanceAnalytics`, `getHotelReports`, `getCalendarData`. 6 routes,
1,244 lines. Largest step; do it last and expect the cross-module composition to
be the hard part.

**7. The barrel.** `getApprovedHotelContextByUserId` → staff module. 22 routes in
one PR, but each edit is a one-line import change with no logic touched. Leaving
it last means every earlier step has already reduced what else those routes
import.

**8. Reporting adapters.** Excel/PDF generators to `src/shared/reporting/`.
Optional; no correctness benefit.

## Interaction with the prisma-in-routes guardrail

Steps 2–7 each let entries be deleted from `eslint.prisma-route-debt.mjs`, which
is the point of that baseline. Rough per-step reduction against the current 149:
step 2 ≈ 4, step 3 ≈ 2, step 4 ≈ 4, step 5 ≈ 4, step 6 ≈ 6.

## What to decide before starting

1. **Does `src/modules/guest` get created, or does guest CRM fold into booking?**
   The architecture doc lists `guest` as an existing module. It does not exist.
   Step 3 assumes it should.
2. **Is `hms-reporting` an acceptable new module**, or should reporting live
   inside each vertical? The former means one module that reads several others;
   the latter means duplicating the composition per report.
3. **Step 5 depends on the booking-paths decision.** Do not start it before that
   is answered.
