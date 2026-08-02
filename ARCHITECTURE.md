# SafarTrip architecture & hardening checklist

Authoritative invariants also live in `.cursor/rules/` (modular monolith, money/ledger, booking status, deploy workflow).

## Recommended order

| Step | Item | Status | Reality (2026-07-26) |
|------|------|--------|----------------------|
| — | `.cursor/rules` + this `ARCHITECTURE.md` | done | — |
| — | Audit / PR review prompt (`docs/PR_REVIEW_PROMPT.md`) | done | — |
| 0 | Reality check | done | [`docs/reviews/2026-07-26-step0-reality.md`](docs/reviews/2026-07-26-step0-reality.md) |
| 1.1 | Repository layer — booking / inventory / payment | **Step 1 done (money modules)** | Prisma runtime removed from inventory service, payment adapters, outbox notification consumer; HMS cancel → `cancelWithPolicy` |
| 1.1 | Repository layer — remaining modules | pending | ~160 API + ~30 lib still on `@/lib/prisma` (out of Step 1 scope) |
| 1.2 | Booking state machine | done | HMS cancel → `cancelWithPolicy` (Step 1) |
| 1.3 | Double-booking + hold TTL | done | Staging watch ~1 week |
| — | DB backup + restore test | scripts landed; **ops verify pending** | **Gate for Step 2** |
| 2.1 | Double-entry ledger dual-write | **done** (2026-08-02 Contabo `a6d1fe1`) | PE + ledger same tx; PLATFORM \| PARTNER `payoutOwnerType` |
| 2.2 | Payment idempotency + webhook dedup | done | `ProcessedEvent` UNIQUE enforced |
| 2.3 | Reconciliation job | **done** | `scripts/reconcile-ledger.ts` — Contabo clean after migrate |
| — | ~~Ledger comparison clean → remove PartnerEarning reads~~ → **hybrid cutover (see below)** | **resolved (hybrid)** | Ledger = balance aggregates; PartnerEarning = line-item subledger |
| 3.1 | Rate engine | done | som↔tiyin still outside payment adapters |
| 3.2 | Cancellation policy engine | done | hotel wired; homestay/guide no ledger reverse |
| 3.3 | Transactional outbox | done | consumer uses outbox repo (Step 1) |
| 3.4 | Tests + CI + Sentry + backup automation | **backup scripts done** | tests/CI/Sentry done; cron install is ops |

## P0 gaps (remaining)

1. ~~Ledger vs PartnerEarning dual-write / cancel funnel~~ — **closed** Steps 2–4 (`a6d1fe1`, Contabo reconcile clean).
2. Float money paths still open for **taxi** (`DriverEarning` / `TODO(taxi)`) — out of PE scope.
3. No **verified** restore-test on Contabo cron yet (scripts exist) — ops follow-up, not blocking accounting reads.

## After every refactor

1. Open a **new** chat on the branch.
2. Paste the prompt from [`docs/PR_REVIEW_PROMPT.md`](docs/PR_REVIEW_PROMPT.md).
3. Optionally save the report under `docs/reviews/`.

## Deploy

Never edit production by hand. Local → git push → server `git pull` + `bash scripts/deploy-safe.sh` (or legacy `deploy.sh`).

## Backup & disaster restore

**Manual gate (before ledger dual-write Step 2):** dump → off-site copy → restore into scratch DB → COUNT checks. Sinalmagan backup — backup emas.

**Automation (repo):**

| Script | Purpose |
|--------|---------|
| [`scripts/backup.sh`](scripts/backup.sh) | `mysqldump` gzip, 7 daily / 4 weekly; **`BACKUP_OFFSITE_CMD` required** (fail if unset/fails) |
| [`scripts/restore-test.sh`](scripts/restore-test.sh) | Strict: exact COUNT match for HotelBooking/LedgerEntry/PartnerEarning, matching `MAX(createdAt)`, freshness ≤36h |
| [`scripts/cron/safartrip-backup.cron.example`](scripts/cron/safartrip-backup.cron.example) | Cron stubs (daily backup, weekly restore-test) |

Env (on server, **not in git**): `/etc/safartrip/backup.env` with `DATABASE_URL`, optional `BACKUP_OFFSITE_CMD` (scp/rclone/b2).

**If the VPS is lost entirely:**

1. Provision new VPS (Node 20+, MySQL 8, Nginx, PM2).
2. Restore DB from latest off-site `.sql.gz` into empty MySQL.
3. `git clone` + checkout production SHA; `npm ci`; `npx prisma generate`; `npx prisma migrate deploy`.
4. Restore secrets manually (they are **NOT** in the repo): `.env` / `.env.local` (JWT secrets, Payme/Click keys, Didox token, `DATABASE_URL`, `CRON_SECRET`, `SENTRY_DSN`, Expo, etc.), Nginx TLS certs, `/etc/safartrip/backup.env`.
5. `npm run build` + standalone copy; `pm2 start ecosystem.config.js` (`safartrip`, `safartrip-expire-holds`, `safartrip-outbox`).
6. Smoke: health, login, one Payme/Click sandbox if available — never skip money path checks.

## Gated remediation status

| Step | Status |
|------|--------|
| 0 Reality | done — `docs/reviews/2026-07-26-step0-reality.md` |
| 1 Invariants | done — `docs/reviews/2026-07-26-step1-invariants.md` |
| 1.5 Hotfix stop new drift | **after** Console SSH verify + restore passed |
| 2 Ledger dual-write | **done** Contabo `a6d1fe1` (historical 2a/2b backfill still optional if old drift appears) |
| 3 Provider recon | open (Payme/Click statement recon — separate from ledger↔PE) |
| 4 Read cutover | **done** — hybrid Ledger balances / PE line items + `bookingType` |
| 5 Backup automation | scripts + cron; DUMP_TS as-of compare; off-site required |

### Ops gate 0 — SSH host key (before any VPS shell / backup)

If client `known_hosts` fingerprint ≠ what SSH offers, **do not SSH** and **do not** run `backup.sh` / `BACKUP_OFFSITE_CMD` until Hetzner **web Console** confirms:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
ls -la /etc/ssh/ssh_host_*
last -20
```

Expected live offer (2026-07-26 scan): `SHA256:6MpEtYMSTHk1WZ6XSR49mhVf3UU6VJBD1ZDTut7jdeg`.  
Use Hetzner **web Console** (root password; panel “Reset root password” if needed — does not wipe the server).

| Console result | Action |
|----------------|--------|
| Fingerprint match + `last` / `auth.log` clean | Find key regen cause (`ls -la` mtime, `/var/log/apt/history.log`) → update `known_hosts` → backup |
| Fingerprint match + unfamiliar IP/session in `last` | **Stop** — incident review even if fingerprint matches |
| Fingerprint mismatch vs Console | **Stop** — incident; no SSH, no backup |

### Step 1.5 — Hotfix (after `restore passed`, before Step 2)

Surgical stop of new drift — no float/PartnerEarning arithmetic change:

1. Hotel `cancelWithPolicy`: no swallowing `catch` on `reversePartnerEarning`; ledger refund + earning reverse in **one** tx; fail → rollback + Sentry + surface error.
2. Homestay/guide cancel: same transactional posting path; if partner unknown → explicit **UNATTRIBUTED** ledger account + recon issue log — never skip.
3. Payment success: resolve `partnerUserId` from booking→property→partner; **never** write null (also Payme `performTransaction`); fail loudly if unresolved. Historical repair = Step 2 only.
4. Tests for each case.

### Step 2 backfill — two separate phases (do not mix)

Confirmed bug: null partner → else-branch credits **100% gross** to Platform Revenue (balanced but misclassified). Ledger entries immutable — no UPDATE.

| Phase | What | How | Dry-run |
|-------|------|-----|---------|
| **2a Reclassify** | Existing `BOOKING_PAYMENT` txs that have no PARTNER credit | Compensating tx only: `DEBIT Platform Revenue partnerNet` + `CREDIT Partner Payable partnerNet`; `type: RECLASSIFICATION`, `originalTransactionId`; partner via hotel→partner join (recoverable set) | Report tiyin moved per tx |
| **2b Primary events** | Never-posted / swallowed (homestay/guide cancel, missed reverses, etc.) | New txs from `HotelBooking` / `Payment` / `PaymentTransaction` / refund audit — **not** from PartnerEarning alone | Diff vs current PartnerEarning + ledger |

~~UI today reads PartnerEarning (not ledger). Still audit any external “revenue” exports that may have used ledger.~~

### Step 4 — Read cutover: general ledger + subledger (resolved)

Do **not** interpret “remove PartnerEarning reads” as “never query PartnerEarning for display.” Resolved pattern:

| Concern | Source of truth | Why |
|---------|-----------------|-----|
| Balances / aggregates (partner payable, pending payout, platform revenue totals) | **Ledger** | Dual-write + `reconcile-ledger.ts` keep GL honest |
| Line items / per-booking breakdown / CSV detail / dispute audit | **PartnerEarning** | Subsidiary ledger; Ledger txs intentionally lack booking-type drill-down |

- Partner dashboards (`/api/hotel|homestay|guide/earnings`): Ledger → `totalNet` / `pendingNet` / `totalCommission`; PE → `earnings[]` + `pendingCount`.
- Admin revenue: Ledger → `totalPlatformCommission` + per-type `platformFee` via `LedgerTransaction.bookingType` (includes PLATFORM-owned); PE `groupBy` → `commissionSummary` (partner-side detail only).
- Taxi/`DriverEarning` remains separate (`TODO(taxi)`).
- Never recompute partner net/commission on-the-fly from `booking.totalPrice` + `getCommissionRates` for display.

### Backup compare (no race)

`backup.sh` writes `DUMP_TS=NOW(6)` **before** `mysqldump --single-transaction` into `*.meta`. `restore-test.sh` compares `COUNT(*) … WHERE createdAt <= DUMP_TS` on prod vs scratch — post-dump traffic excluded.

## Knowledge base (Site / Claim / Source)

Factual backbone for the trip builder (no invented places/prices) and guide accuracy intake. Module: `src/modules/knowledge/`. **Does not touch money, ledger, or booking payment paths.**

### Locked names (do not invent aliases)

| Concept | Name |
|---------|------|
| Place model | `Site` |
| Confidence enum | `ClaimLevel` |
| Derive function | `deriveClaimLevel` |
| Citation model | `Source` |
| Join model | `ClaimSource` |

Also: `ClaimPosition` (disputes), `AccuracyReport` (intake; `guideUserId` not listing id).

### Trust model

- LLM never invents places, prices, dates, or historical facts — candidates come from `PUBLISHED` sites/claims; narrative is connective prose only (`src/modules/tripai`, later).
- `ClaimLevel` is **derived** by pure `deriveClaimLevel` unless an admin locks it (`levelLockedBy` + required `levelLockedNote`).
- Independence for `TASDIQLANGAN`: **≥ 2 distinct `Source.publisherKey`** at `A_RASMIY` (normalize via `normalizePublisherKey`), not ClaimSource row count.
- `NIZOLI`: keep **all** positions; never pick a winner in UI or API.
- Seed / import: status **`DRAFT`** until sources are attached — never bulk-`PUBLISHED` from `tourism_data.json`.
- `AccuracyReport.upheld`: `null` unreviewed, `true` upheld, `false` rejected — transparency pages show received vs upheld separately.
- Opening hours: machine-readable JSON only (`isOpenAt` / `nextOpenSlot`); never free-text hours.

### Migration

`prisma/migrations/20260729180000_knowledge_base/` — apply only via deploy (`scripts/deploy-safe.sh`), not ad-hoc against remote DBs from a laptop.