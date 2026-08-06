# SafarTrip production deploy

**Never modify production by hand.** No `scp` of source, no SSH edits under `/var/www/safar`, no `npm run build` without a matching `git pull` of a CI-green SHA.

## Golden rule: where builds happen

| Situation | Build where? |
|-----------|----------------|
| Normal operations (real customer/payment data on the DB) | **Never on the production server.** Build in CI (or a separate build host), then deploy a verified artifact / pull a CI-green SHA and run a pre-built package. |
| **Exception (current Contabo cutover only)** | On-server build is allowed **only while** the DB is still empty/fresh **and** the site is already down. Stop as soon as real data exists. |

Node on the server **must match CI**: **Node 22**.

Production host: Contabo VPS, app path `/var/www/safar`, PM2 app name `safartrip`.

## Prerequisites (every deploy)

1. The commit is green on GitHub Actions (`CI` workflow), including **`npm run build`**.
2. You are deploying that exact SHA (`git rev-parse HEAD` matches the CI run).
3. All server commands that touch the app tree run as **`safartrip`**, never as root. Root-owned `.next` breaks PM2 running as `safartrip`.

## Branch protection (manual — GitHub UI)

Workflow job name is **`test`** (check run name: `test`). A green Actions run alone does **not** block merges unless this is required.

**Status (2026-08-02):** repo is **public**; ruleset **`main`** is **Active** with required check **`test`**, PR required, force-push blocked. (Private + Free still cannot use rulesets — Pro or public required.)

Re-create / edit via **Settings → Rules → Rulesets** (or classic Branches UI):

1. Target branch pattern: `main`; enforcement **Active**.
2. Enable **Require a pull request before merging** (recommended).
3. Enable **Require status checks to pass** → add check **`test`** (workflow `CI`, job `test`). Do **not** rename that job in `.github/workflows/ci.yml` — renames silently unhook this setting.
4. Save.

```bash
# Wrong
sudo npm run build

# Right
sudo -u safartrip -H bash -lc 'cd /var/www/safar && …'
```

## Ordered command list (current cutover exception — on-server build)

Use this only while the DB is empty and the site is down. Prefer `scripts/deploy-safe.sh`.

```bash
cd /var/www/safar

# 1. Sync code to a CI-green SHA
sudo -u safartrip -H bash -lc 'cd /var/www/safar && git fetch origin && git reset --hard origin/main'

# 2. Install (postinstall runs prisma generate)
sudo -u safartrip -H bash -lc 'cd /var/www/safar && npm ci'

# 3. Explicit generate + migrate (belt-and-suspenders; generate also runs in prebuild)
sudo -u safartrip -H bash -lc 'cd /var/www/safar && npx prisma generate && npx prisma migrate deploy'

# 4. Free RAM before build — REQUIRED on ~8 GB hosts
# Tradeoff: site stays down; MySQL briefly unavailable if stopped.
sudo -u safartrip -H bash -lc 'pm2 stop all' || true
sudo systemctl stop mysql || sudo systemctl stop mysqld || true

# 5. Build — heap belongs in the environment, not package.json.
# Why 3072 (not 8192): V8 delays GC when max-old-space-size exceeds what the host
# can actually provide; on an 8 GB box that causes early OOM kills.
sudo -u safartrip -H bash -lc 'cd /var/www/safar && export NODE_OPTIONS=--max-old-space-size=3072 && npm run build'

# 6. Restart MySQL, then PM2 as safartrip
sudo systemctl start mysql || sudo systemctl start mysqld
sudo -u safartrip -H bash -lc 'cd /var/www/safar && pm2 start ecosystem.config.js || pm2 restart safartrip --update-env'
sudo -u safartrip -H bash -lc 'pm2 save'
```

Or in one shot (same ordering, including stop PM2/MySQL around build):

```bash
cd /var/www/safar
# As root: deploy-safe can stop/start MySQL for RAM during build.
bash scripts/deploy-safe.sh

# As safartrip (no passwordless sudo for systemctl): skip MySQL stop — avoids polkit hang.
sudo -u safartrip -H bash -lc 'cd /var/www/safar && STOP_MYSQL_FOR_BUILD=0 bash scripts/deploy-safe.sh'
```

`STOP_MYSQL_FOR_BUILD=0` keeps MySQL up during build (safer when not root; use on 8 GB only if RAM allows).

## Verify

```bash
curl -sS http://127.0.0.1:3000/api/health | jq
# 200 = ok or degraded, 503 = unhealthy

sudo -u safartrip -H bash -lc 'pm2 status'
sudo -u safartrip -H bash -lc 'pm2 logs safartrip --lines 80'
```

`/api/health` reports per-component status, not just DB connectivity:

| Component | Unhealthy when |
| --- | --- |
| `database` | `SELECT 1` fails |
| `env` | a fatal env problem (see `src/shared/env.ts`); unconfigured integrations are `degraded` |
| `outbox` | oldest due PENDING event unprocessed for 5 min (1 min ⇒ degraded); FAILED rows ⇒ degraded |
| `outbox-relay` | no heartbeat for 15 min (5 min ⇒ degraded) |
| `expiry-cron` | no heartbeat for 15 min (5 min ⇒ degraded) |

Heartbeats are `SystemSetting` rows keyed `worker_heartbeat:<worker>`, written by
the workers after a successful run. A host that has never run the cron reports
`degraded` with `no run recorded yet` rather than failing.

### Image optimization

`images.unoptimized` was hardcoded `true` after `/_next/image` served broken
hero/favicon images on the VPS. It is now on by default and controlled by an env
var, because only half of that cause is verifiable in CI:

- **sharp** — settled. It is a direct dependency and reaches the runtime through
  both `copy:standalone` and the PM2 entry (`tsx server.ts`, run from the repo
  root). Verified locally against a production build: `/hero-bg.png` is 982 KB,
  `/_next/image?url=%2Fhero-bg.png&w=640&q=75` returns 73 KB of WebP.
- **nginx** — must proxy `/_next/image` to the app like any other route. If it
  rewrites or short-circuits it, images 404 or 502.

Check it after the first deploy that includes this:

```bash
curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  -H 'Accept: image/avif,image/webp,*/*' \
  'https://safartrip.uz/_next/image?url=%2Fhero-bg.png&w=640&q=75'
# expect: 200 image/webp <much smaller than the original>
```

If it fails, roll back without a redeploy — add `NEXT_IMAGE_UNOPTIMIZED=true` to
`.env` and `pm2 restart safartrip --update-env` — then fix the nginx location.

Check `.next` ownership is `safartrip`, not `root`:

```bash
stat -c '%U' /var/www/safar/.next
```

## Rollback

```bash
cd /var/www/safar
sudo -u safartrip -H bash -lc 'cd /var/www/safar && git fetch origin && git reset --hard <previous_ci_green_sha>'
# Cutover exception only: rebuild that SHA with the same stop-PM2/MySQL → build → start flow.
# Once artifact-based deploys exist: restore the previous artifact and pm2 restart — no rebuild.
sudo -u safartrip -H bash -lc 'cd /var/www/safar && bash scripts/deploy-safe.sh'
```

If a forward migration is incompatible: restore the DB dump first, then reset code to the matching SHA.

## Payment providers after a fresh DB

Click and Payme credentials are **not** primary `.env` secrets for checkout.

They live in the database:

- Table/key: `SystemSetting` value for **`payment_providers`**
- Loaded by `src/modules/payment/domain/provider-config.ts` (`getClickConfig` / `getPaymeConfig`)
- Admin UI: **Admin → Settings → Payments** (`/admin/settings/payments`)

After cutover on a fresh Contabo DB:

1. Sign in as admin.
2. Re-enter **Click** (`serviceId`, `merchantId`, `secretKey`, enabled).
3. Re-enter **Payme** (`merchantId`, `merchantKey`/`secretKey`, enabled) in the same `payment_providers` JSON.
4. Confirm webhook URLs in Click/Payme dashboards point at this host.
5. Run a **small test transaction** end-to-end before announcing the site is live.

Also confirm runtime env still has `DATABASE_URL`, JWT secrets, and `NEXT_PUBLIC_APP_URL` / `APP_URL` for redirects — those stay in `.env`, not in `payment_providers`.

**Payme Merchant / kassa handoff** (Endpoint URL, `order_id` account, fiscal MXIK): see [`docs/PAYME_MERCHANT.md`](./PAYME_MERCHANT.md).

## Related scripts

- `scripts/deploy-safe.sh` — preferred path (migrate, typecheck, tests, memory-aware build, PM2 reload)
- `scripts/deploy.sh` — older path (`db push`); prefer deploy-safe
- CI: `.github/workflows/ci.yml` — must pass `npm run build` before merge
