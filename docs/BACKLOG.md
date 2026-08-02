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

`getMaxIntraDayLegKm(regionCode)` in `tripai/domain/maxIntraDayLegKm.ts`. No schema change (`Site.regionCode` already existed). Confirmed: `samarqand: 12`, `buxoro: 8`, `xiva: 3`.

## Planner (open)

### Far / day-trip sites never get a day-start

Assumption that a far `SECONDARY` (e.g. Imom al-Buxoriy) would open a later day failed in prod: day-starts stay `PRIMARY`-first; slots 2+ are capped by `MAX_INTRA_DAY_LEG_KM` (~12 km, Samarqand-tuned). Result: Imom is **unreachable** in a 3×3 plan.

**Directions:**

- Mark day-trips (`isDayTrip` editorial flag and/or auto by distance from region centroid / PRIMARY cluster).
- Reserve a day-start (or a whole day) for them — especially on **4+ day** plans.
- Pair with per-`regionCode` leg budget (below).

### Other planner follow-ups

- `NO_DATA` reasons (`NO_CANDIDATES` / `TOO_FAR`) and split `dataCoverage` (geography vs thin catalog).
- ~~`MAX_INTRA_DAY_LEG_KM` → map by `regionCode`~~ — done (`getMaxIntraDayLegKm`); confirmed `samarqand: 12` / `buxoro: 8` / `xiva: 3`; unmapped → 12 + `console.warn`. Still open: `toshkent` explicit entry.

## Knowledge / catalog

- When seeding Bukhara Sites: publish verified lat/lng for a historic-core reference Site (Ark or Kalyan) **and** Chor-Bakr — not the ad-hoc pair once used for the leg-budget estimate.
- Three unresolved restaurants need Maps links: Plov Centre, Bibi-Xonim, Lyabi-Hauz.
- Restaurant + `BOSHQA` publish policy — manual decision for now.

## Ops

- Drop `_prisma_migrations_backup` after 1–2 weeks of clean `migrate deploy` on Contabo.
- ~~CI workflow generate→typecheck→build→migrate→vitest~~ — audited 2026-08-02: no `continue-on-error`; build restored since `981116c` (2026-07-30). Real gap: **`main` branch protection is OFF** (`protected: false`) — Rustam must require check **`test`** in GitHub UI (see `docs/DEPLOY.md`). Lint still intentionally out of CI (await OK to re-add).
- ~~Contabo `restore-test.sh` end-to-end~~ — **PASS** 2026-08-02 after manual fresh backup (`safartrip-2026-08-02.sql.gz`, age_hours=0, scratch==prod @ DUMP_TS). WARNs: bookings/ledger/earnings COUNT=0 (tables present, empty as-of — expected if no money rows yet).
- ~~Cron gap (silent backups)~~ — root cause: `backup.sh` / `restore-test.sh` mode **0644** → cron bare exec `Permission denied` (log had 7 nights of that). rclone under `safartrip` OK. Fix: `chmod +x` on Contabo **now** + cron lines use `/bin/bash …/script.sh`; repo 0755 + example updated.
- ~~After `pm2 stop all`, remember to restart outbox + expire-holds~~ — fixed in `deploy-safe.sh` (always `pm2 restart` all three; previously `reload` on stopped outbox was swallowed).
- ~~eslint linting `standalone/`~~ — ignored in `eslint.config.mjs`.
- Post-deploy smoke (human, Contabo — after outbox catch-up CPU drops):  
  `pm2 logs safartrip-outbox --lines 200 --nostream | grep -iE 'error|fail'`  
  Empty grep = good. Brief ~100%+ CPU right after restart is backlog drain, not a hang.

## Next pick

1. **Ops (human):** enable branch protection required check `test`; Contabo `chmod +x` + cron bash-wrap (until this PR deployed).
2. **Planner:** day-trip day-start reservation; optional `toshkent` map entry.
