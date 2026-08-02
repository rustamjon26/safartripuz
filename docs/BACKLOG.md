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

### Region-aware `MAX_INTRA_DAY_LEG_KM` — merged `main` @ `7fdf52e` (PR #20)

`getMaxIntraDayLegKm(regionCode)` in `tripai/domain/maxIntraDayLegKm.ts`. No schema change (`Site.regionCode` already existed). Confirmed: `samarqand: 12`, `buxoro: 8`, `xiva: 3`. No Contabo migrate needed.

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
- ~~Three unresolved restaurants (Maps links)~~ — resolved + Contabo seeded 2026-08-02 @ `01dba4c`: `seed:knowledge` → **created=3 updated=0 unchanged=22** (DRAFT). Rows: `Samarqand Osh Markazi N1`, `Bibixonim Choyxona`, `Lyabi House` (Buxoro).
- Restaurant + `BOSHQA` publish policy — manual decision for now.

## Ops — still OPEN (do not mark closed yet)

- Drop `_prisma_migrations_backup` after 1–2 weeks of clean `migrate deploy` on Contabo.
- ~~CI workflow generate→typecheck→build→migrate→vitest~~ — audited 2026-08-02: no `continue-on-error`; build gate in workflow since `981116c`. Job check name: **`test`**. Lint still intentionally out (still red locally).
- **Branch protection / required `test` — BLOCKED on GitHub Free private repos.** UI + admin `gh` both return *Upgrade to GitHub Pro or make this repository public* (HTTP 403). Not a token/agent issue. Unblock via **(a) personal GitHub Pro** / **org GitHub Team**, or **(b) make repo public**, then require check **`test`**. Until then merges are not gated.
- ~~Contabo `restore-test.sh` end-to-end~~ — **PASS** 2026-08-02 (manual fresh dump, age_hours=0, scratch==prod).
- Cron `+x` / bash-wrap **applied on Contabo** 2026-08-02 11:58; manual `[backup] OK` + off-site OK. **Nightly 02:15 still unproven** — log/journal only show pre-fix `Permission denied` / FAILED through 2026-08-02 02:15. Await next 02:15 `[backup] OK` before closing this item.
- ~~After `pm2 stop all`, remember to restart outbox + expire-holds~~ — fixed in `deploy-safe.sh`.
- ~~eslint linting `standalone/`~~ — ignored in `eslint.config.mjs`.
- Post-deploy smoke (human, Contabo):  
  `pm2 logs safartrip-outbox --lines 200 --nostream | grep -iE 'error|fail'`

## Next pick

1. **Ops (still open):** (i) personal **GitHub Pro** or public → require check `test`; (ii) nightly `[backup] OK` after 02:15.
2. **Planner:** day-trip day-start reservation; optional `toshkent` map entry.
3. **Knowledge (optional):** publish policy for dining DRAFTs / `BOSHQA` — manual.
