# Trip AI / knowledge backlog

Living list — not a commitment to order. Update when items land or change.

## Done recently

### P0 accounting refactor (Steps 2–4) — closed 2026-08-02 Contabo

Deployed `main` @ `a6d1fe1`. Migrations applied: `add_ledger_booking_type`, `add_payout_owner_type` (plus prior `0_init` / `site_prominence`). Post-deploy `reconcile-ledger.ts`: **clean: YES**, all drift counts 0, no POLICY notes.

| Step | What |
|------|------|
| 2 | Dual-write PE + ledger; cancel funnel; integer commission; fail-loud partner |
| 2 follow-up | Explicit `payoutOwnerType` PLATFORM \| PARTNER |
| 3 | Read-only `reconcile-ledger.ts` |
| 4 | Hybrid reads (Ledger balances / PE line items) + `LedgerTransaction.bookingType` |

### Same-tier zigzag (name beats distance) — fixed (PR #15)

Slots 2+ sort: `prominenceRank → distanceKm → name`. Prod regression was Aqsaroy → Hazrati Xizr instead of nearer Ruxobod.

### Region-aware `MAX_INTRA_DAY_LEG_KM` — landed (this PR)

`getMaxIntraDayLegKm(regionCode)` in `tripai/domain/maxIntraDayLegKm.ts`. No schema change (`Site.regionCode` already existed). Samarqand locked at 12; Buxoro/Xiva PROPOSED.

## Planner (open)

### Far / day-trip sites never get a day-start

Assumption that a far `SECONDARY` (e.g. Imom al-Buxoriy) would open a later day failed in prod: day-starts stay `PRIMARY`-first; slots 2+ are capped by `MAX_INTRA_DAY_LEG_KM` (~12 km, Samarqand-tuned). Result: Imom is **unreachable** in a 3×3 plan.

**Directions:**

- Mark day-trips (`isDayTrip` editorial flag and/or auto by distance from region centroid / PRIMARY cluster).
- Reserve a day-start (or a whole day) for them — especially on **4+ day** plans.
- Pair with per-`regionCode` leg budget (below).

### Other planner follow-ups

- `NO_DATA` reasons (`NO_CANDIDATES` / `TOO_FAR`) and split `dataCoverage` (geography vs thin catalog).
- ~~`MAX_INTRA_DAY_LEG_KM` → map by `regionCode`~~ — done (`getMaxIntraDayLegKm`); `samarqand: 12` locked; **`xiva: 3` CONFIRMED**; **`buxoro: 7` still PROPOSED** (Chor-Bakr haversine knife-edge — early 4.3 km was ad-hoc coords, not Site rows; Wikipedia Chor-Bakr ↔ Ark/Kalyan ≈ 6.6–7.6 km → consider 8). Unmapped → 12 + `console.warn`. Still open: `toshkent` explicit entry.

## Knowledge / catalog

- Three unresolved restaurants need Maps links: Plov Centre, Bibi-Xonim, Lyabi-Hauz.
- Restaurant + `BOSHQA` publish policy — manual decision for now.

## Ops

- Drop `_prisma_migrations_backup` after 1–2 weeks of clean `migrate deploy` on Contabo.
- **CI build gate / restore-test verify** — scripts exist; cron + verified restore still ops — **next candidate**.
- ~~After `pm2 stop all`, remember to restart outbox + expire-holds~~ — fixed in `deploy-safe.sh` (always `pm2 restart` all three; previously `reload` on stopped outbox was swallowed).
- ~~eslint linting `standalone/`~~ — ignored in `eslint.config.mjs`.
- Post-deploy smoke (human, Contabo — after outbox catch-up CPU drops):  
  `pm2 logs safartrip-outbox --lines 200 --nostream | grep -iE 'error|fail'`  
  Empty grep = good. Brief ~100%+ CPU right after restart is backlog drain, not a hang.

## Next pick

1. **Ops:** verified `restore-test.sh` + cron / CI build gate.
2. **Planner:** day-trip day-start reservation + confirm PROPOSED `buxoro`/`xiva` km; optional `toshkent` map entry.
