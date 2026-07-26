# Step 5 — Backup automation (2026-07-26)

## Changed

- `scripts/backup.sh` — `DUMP_TS` before dump → `*.meta` sidecar; off-site **mandatory**; copy `$OUT_DAILY` + `$OUT_META`
- `scripts/restore-test.sh` — as-of `DUMP_TS` COUNT/MAX match (no live-traffic race); dump age ≤36h
- `scripts/cron/safartrip-backup.cron.example` — daily backup + weekly restore-test; logs via `logger` on failure
- `ARCHITECTURE.md` — Backup & disaster restore (VPS loss + secrets-not-in-repo)
- `package.json` — `db:backup` / `db:restore-test` script aliases (run on Linux/VPS)

## Deliberately not changed

- No secrets committed; `/etc/safartrip/backup.env` stays server-only
- No auto-install of cron on the VPS (ops copies the example)
- Ledger dual-write / recon / read cutover (Steps 2–4) — gated

## How to test (on VPS)

```bash
# /etc/safartrip/backup.env must have DATABASE_URL + BACKUP_OFFSITE_CMD
# e.g. BACKUP_OFFSITE_CMD='scp "$OUT_DAILY" "$OUT_META" you@other:/backups/'
set -a; . /etc/safartrip/backup.env; set +a
bash scripts/backup.sh && bash scripts/restore-test.sh
# Expect as-of DUMP_TS COUNT match + fresh dump + [restore-test] PASS
# Then on off-site host: ls -lh /backups/safartrip-*
```

Install cron from `scripts/cron/safartrip-backup.cron.example`. Wire Telegram/Sentry to cron failure mail/logger if desired.

## Rollback

Remove cron entries; delete the three scripts + ARCHITECTURE section.

## Note on sequence

Plan lists Step 5 after cutover; scripts were delivered early so the **manual restore gate for Step 2** has automation support. Ops must still confirm a successful restore before Step 2 code.
