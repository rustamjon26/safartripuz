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

### ~~Far / day-trip sites never get a day-start~~ — fixed (domain)

Auto day-trip = farther than `getMaxIntraDayLegKm(regionCode)` from every PRIMARY; optional `ScheduleCandidateInput.isDayTrip` override. Reserves later day-starts: **1** on 3-day plans, up to `dayCount - 2` on 4+. No schema migration. See `dayTrip.ts` + `scheduleDays`.

Still open (optional follow-ups):

- Persist editorial `isDayTrip` on `Site` (Prisma) for seed/admin.
- Whole-day reservation (not just day-start) when a day-trip has nearby companions.

### Other planner follow-ups

- `NO_DATA` reasons (`NO_CANDIDATES` / `TOO_FAR`) and split `dataCoverage` (geography vs thin catalog).
- ~~`MAX_INTRA_DAY_LEG_KM` → map by `regionCode`~~ — done (`getMaxIntraDayLegKm`); confirmed `samarqand: 12` / `buxoro: 8` / `xiva: 3`; `toshkent: 12` explicit (same as default until city-core span measured); other unmapped → 12 + `console.warn`.

## Knowledge / catalog

- When seeding Bukhara Sites: publish verified lat/lng for a historic-core reference Site (Ark or Kalyan) **and** Chor-Bakr — not the ad-hoc pair once used for the leg-budget estimate.
- ~~Three unresolved restaurants (Maps links)~~ — resolved 2026-08-02 into `tourism_data.json` as DRAFT rows with Google `cid` `sourceUrl`; Contabo seed `created=3`:
  - Plov Centre → `Samarqand Osh Markazi N1` (`cid=14268127267228355785`)
  - Bibi-Xonim → `Bibixonim Choyxona` / Bibikhanum Teahouse (`cid=5531354908977729096`) — not the mosque
  - Lyabi-Hauz → `Lyabi House` Buxoro (`cid=16248639576405358982`) — not UNESCO square / not Tashkent namesake
  Maps browser pull 2026-08-02: **Osh Markazi** + **Bibixonim Choyxona** hours/price filled in seed (publishable after re-seed). **Lyabi House** still DRAFT — Maps lists hotel, no restaurant weekly hours (do not invent).
- ~~Restaurant + `BOSHQA` publish policy~~ — `evaluatePublishEligibility` / `knowledgeService.publishSite`: dining needs planner-grade `parseDining`; **BOSHQA** same base gates as landmarks, no dining JSON, no auto-publish. Seed still never writes `PUBLISHED`.

## Ops — still OPEN (do not mark closed yet)

- Drop `_prisma_migrations_backup` after 1–2 weeks of clean `migrate deploy` on Contabo.
- ~~CI workflow generate→typecheck→build→migrate→vitest~~ — audited 2026-08-02: no `continue-on-error`; build gate in workflow since `981116c`. Job check name: **`test`**. Lint still intentionally out (still red locally).
- ~~Branch protection / required `test`~~ — **DONE 2026-08-02.** Repo made **public**; ruleset `main` **Active** with required status check **`test`**, PR required, non-fast-forward. Verified via `gh api …/rules/branches/main`.
- ~~Contabo `restore-test.sh` end-to-end~~ — **PASS** 2026-08-02 (manual fresh dump, age_hours=0, scratch==prod).
- Cron `+x` / bash-wrap **applied on Contabo** 2026-08-02 11:58; post-fix **manual** `[backup] OK` + off-site OK. **Nightly 02:15 still unproven** — await **2026-08-03 02:15** `[backup] OK` (no syslog `FAILED`) before closing this item.
- ~~After `pm2 stop all`, remember to restart outbox + expire-holds~~ — fixed in `deploy-safe.sh`.
- ~~eslint linting `standalone/`~~ — ignored in `eslint.config.mjs`.
- Post-deploy smoke (human, Contabo):  
  `pm2 logs safartrip-outbox --lines 200 --nostream | grep -iE 'error|fail'`

## Next pick

1. **Ops (last open):** nightly `[backup] OK` after **2026-08-03 02:15** (manual path already green).
2. **Knowledge:** Contabo re-seed + `publishSite` for Osh Markazi + Bibixonim (Lyabi House stays DRAFT — hotel, no hours).
3. **Planner:** optional `Site.isDayTrip` column; whole-day day-trip reservation follow-up.
