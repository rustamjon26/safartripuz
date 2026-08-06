#!/bin/bash
# Safe production deploy — git-only, tests before restart, prefer migrate over db push.
#
# Usage (on server):
#   cd /var/www/safar && bash scripts/deploy-safe.sh
#   # or: npm run deploy:safe
#
# Rollback:
#   cd /var/www/safar
#   git fetch origin && git checkout <previous_sha>
#   # or: git reset --hard <previous_sha>
#   bash scripts/deploy-safe.sh
#   # If a forward-only migration is incompatible: restore DB dump first, then code.
#
# Never scp / hand-edit production source. See .cursor/rules/deploy-workflow.mdc

set -euo pipefail

cd /var/www/safar

APP_USER="${DEPLOY_AS_USER:-safartrip}"
PM2_APPS=(safartrip safartrip-outbox safartrip-expire-holds)

# Root + safartrip each get their own PM2 daemon (~/.pm2). Deploying as root
# then checking status as safartrip is how we got EADDRINUSE + two stacks on
# :3000. Always run the deploy body as APP_USER; root may only pre-stop MySQL.
if [[ "$(id -un)" != "$APP_USER" ]]; then
  if [[ "$(id -u)" -eq 0 ]]; then
    echo "==> Fixing tree ownership for ${APP_USER} (root-owned .next/.git breaks the next pull)..."
    chown -R "${APP_USER}:${APP_USER}" /var/www/safar
    # Kill a root-owned PM2 that may still hold :3000 from a previous bad deploy.
    echo "==> Stopping root PM2 daemon (must not share the port with ${APP_USER})..."
    pm2 kill 2>/dev/null || true
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 1
    # Body always runs as APP_USER so PM2_HOME is ~safartrip/.pm2. MySQL stop
    # during build needs passwordless sudo from that user, or a separate root
    # `systemctl stop mysql` before this script — we do not leave MySQL down here.
    echo "==> Re-executing deploy as ${APP_USER}..."
    exec sudo -u "${APP_USER}" -H env \
      "STOP_MYSQL_FOR_BUILD=${STOP_MYSQL_FOR_BUILD:-0}" \
      "DEPLOY_AS_USER=${APP_USER}" \
      "NODE_OPTIONS=${NODE_OPTIONS:-}" \
      bash "$0" "$@"
  fi
  echo "==> FATAL: run as ${APP_USER} (or root, which re-execs as ${APP_USER})." >&2
  echo "    Example: sudo -u ${APP_USER} -H bash -lc 'cd /var/www/safar && bash scripts/deploy-safe.sh'" >&2
  exit 1
fi

echo "==> Pulling latest..."
# Fetch only main to avoid unrelated remote-ref permission noise; keep working tree on main.
git fetch origin main
git merge --ff-only FETCH_HEAD || git reset --hard origin/main

echo "==> Installing dependencies..."
npm ci || npm install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying migrations (prefer migrate deploy over db:push)..."
npx prisma migrate deploy

echo "==> Typecheck + lint + unit tests..."
npm run typecheck
# Blocking, matching CI. eslint errors are zero on main; the remaining ~430
# warnings are the migration-debt gauge and do not fail the run.
npm run lint
npm run test:unit

# Integration tests are deliberately NOT run here. They need a throwaway
# database (src/test/db.ts refuses to run without TEST_DATABASE_URL, and
# resetTestDb drops the schema), and this host only has production MySQL —
# pointing them at it would erase live data. CI is the gate that runs the full
# suite against a disposable MySQL service container; this script re-runs the
# cheap, side-effect-free checks as a last line of defence against deploying a
# SHA that never went through a PR.
#
# Set TEST_DATABASE_URL on this host (a separate, empty database) to opt in.
if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  echo "==> Integration tests (TEST_DATABASE_URL is set)..."
  npm run test:integration
else
  echo "==> Integration tests: skipped (no TEST_DATABASE_URL — CI covers these)."
fi

# Same reason: drift detection needs a shadow database it can drop.
if [[ -n "${SHADOW_DATABASE_URL:-}" ]]; then
  echo "==> Migration drift check..."
  bash scripts/check-migration-drift.sh
else
  echo "==> Migration drift check: skipped (no SHADOW_DATABASE_URL — CI covers this)."
fi

# Tradeoff: stopping the Next.js app (and optionally MySQL + workers) during build
# frees RAM on ~8 GB hosts. Cost: site AND database DOWN for the whole build window,
# which also fails in-flight Payme/Click webhooks. Opt in per run on RAM-starved
# hosts: STOP_MYSQL_FOR_BUILD=1 bash scripts/deploy-safe.sh
STOP_MYSQL_FOR_BUILD="${STOP_MYSQL_FOR_BUILD:-0}"
MYSQL_WAS_STOPPED=0
MYSQL_UNIT=""
PM2_STOPPED_FOR_BUILD=0

# Anything after this point has already taken production down. `set -e` on a failed
# build would otherwise leave PM2 stopped until someone logs in and starts it.
restore_services_on_failure() {
  local code=$?
  if [[ $code -eq 0 ]]; then
    return 0
  fi
  echo "==> Deploy failed (exit ${code}); restoring previous services..." >&2
  if [[ "$MYSQL_WAS_STOPPED" == "1" && -n "$MYSQL_UNIT" ]]; then
    start_mysql_unit "$MYSQL_UNIT" || \
      echo "==> FATAL: could not restart ${MYSQL_UNIT}." >&2
  fi
  if [[ "$PM2_STOPPED_FOR_BUILD" == "1" ]]; then
    pm2 start "${PM2_APPS[@]}" 2>/dev/null || pm2 start ecosystem.config.js || true
  fi
  return $code
}

# Bare `systemctl stop` as non-root triggers polkit interactive auth, hangs the
# deploy, then times out — leaving PM2 stopped. Only stop MySQL as root or via
# passwordless sudo (-n). Otherwise build with MySQL still up.
can_manage_mysql_unit() {
  local unit="$1"
  if [[ "$(id -u)" -eq 0 ]]; then
    return 0
  fi
  sudo -n systemctl status "$unit" >/dev/null 2>&1
}

stop_mysql_unit() {
  local unit="$1"
  if [[ "$(id -u)" -eq 0 ]]; then
    systemctl stop "$unit"
    return $?
  fi
  sudo -n systemctl stop "$unit"
}

start_mysql_unit() {
  local unit="$1"
  if [[ "$(id -u)" -eq 0 ]]; then
    systemctl start "$unit"
    return $?
  fi
  sudo -n systemctl start "$unit"
}

trap restore_services_on_failure EXIT

if [[ "$STOP_MYSQL_FOR_BUILD" == "1" ]]; then
  # MySQL down → workers will fail; stop the full PM2 set.
  echo "==> Stopping all PM2 apps (MySQL may stop for build)..."
  pm2 stop all || true
  PM2_STOPPED_FOR_BUILD=1

  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet mysql 2>/dev/null; then
      MYSQL_UNIT="mysql"
    elif systemctl is-active --quiet mysqld 2>/dev/null; then
      MYSQL_UNIT="mysqld"
    fi
  fi

  if [[ -n "$MYSQL_UNIT" ]]; then
    if can_manage_mysql_unit "$MYSQL_UNIT"; then
      echo "==> Stopping ${MYSQL_UNIT} for build (set STOP_MYSQL_FOR_BUILD=0 to skip)..."
      if stop_mysql_unit "$MYSQL_UNIT"; then
        MYSQL_WAS_STOPPED=1
      else
        echo "==> WARN: failed to stop ${MYSQL_UNIT}; continuing build with MySQL up." >&2
      fi
    else
      echo "==> WARN: cannot stop MySQL as $(id -un) (no root / sudo -n systemctl)." >&2
      echo "    Building with MySQL up. Re-run as root, or: STOP_MYSQL_FOR_BUILD=0 bash scripts/deploy-safe.sh" >&2
    fi
  fi
else
  # Keep outbox + expire-holds running; only free RAM from the Next.js process.
  echo "==> Stopping PM2 app safartrip only (workers stay up; STOP_MYSQL_FOR_BUILD=0)..."
  pm2 stop safartrip || true
  PM2_STOPPED_FOR_BUILD=1
fi

# ~8 GB VPS: do NOT request 8192 MB old-space. V8 treats max-old-space-size as a soft
# ceiling and delays GC when it thinks plenty of heap remains; if that ceiling exceeds
# what the host can actually provide (OS + MySQL + Node workers), the build dies at a
# few hundred MB or gets OOM-killed. 3072 leaves headroom for the OS and webpack workers.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
echo "==> Building with NODE_OPTIONS=$NODE_OPTIONS ..."
npm run build

if [[ "$MYSQL_WAS_STOPPED" == "1" && -n "$MYSQL_UNIT" ]]; then
  echo "==> Starting ${MYSQL_UNIT} after build..."
  if ! start_mysql_unit "$MYSQL_UNIT"; then
    echo "==> FATAL: could not start ${MYSQL_UNIT} after build." >&2
    exit 1
  fi
fi

echo "==> Copying standalone assets..."
cp -r .next/standalone ./standalone
cp -r .next/static ./standalone/.next/static
cp -r public ./standalone/public
cp .env ./standalone/.env
cp .env ./.next/standalone/.env
if [ -f .env.local ]; then
  cp .env.local ./standalone/.env.local
  cp .env.local ./.next/standalone/.env.local
fi

# Always stop → free :3000 → start. Plain `pm2 restart` can report online while the
# new Node process dies with EADDRINUSE and an orphan keeps serving the old .next
# (HTML references deleted chunk hashes → /_next/static/... 500).
echo "==> Stopping PM2 apps before bind: ${PM2_APPS[*]} ..."
pm2 stop "${PM2_APPS[@]}" || true
sleep 1
if command -v fuser >/dev/null 2>&1; then
  echo "==> Freeing TCP :3000 if still held..."
  fuser -k 3000/tcp 2>/dev/null || true
else
  # Best-effort: show leftover listeners (manual kill if fuser absent).
  ss -lptn 'sport = :3000' 2>/dev/null || true
fi
# Wait until nothing listens — otherwise the new process dies with EADDRINUSE
# while PM2 still reports "online".
for _wait in 1 2 3 4 5 6 7 8 9 10; do
  if ! ss -lptn 'sport = :3000' 2>/dev/null | grep -q ':3000'; then
    break
  fi
  echo "==> :3000 still busy (wait ${_wait}/10); killing again..."
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 1
done
if ss -lptn 'sport = :3000' 2>/dev/null | grep -q ':3000'; then
  echo "==> FATAL: could not free TCP :3000 before start." >&2
  ss -lptn 'sport = :3000' >&2 || true
  exit 1
fi

echo "==> Starting PM2 apps: ${PM2_APPS[*]} ..."
if ! pm2 start "${PM2_APPS[@]}" --update-env 2>/dev/null; then
  echo "==> start by name failed — starting from ecosystem.config.js ..."
  pm2 start ecosystem.config.js
  pm2 restart "${PM2_APPS[@]}" --update-env
fi
pm2 save
PM2_STOPPED_FOR_BUILD=0

echo "==> PM2 status:"
pm2 status

# Fail deploy if the process on :3000 is still serving a stale build.
EXPECTED_BUILD_ID="$(tr -d '[:space:]' < .next/BUILD_ID)"
echo "==> Verifying runtime serves on-disk trip-builder chunk (BUILD_ID=${EXPECTED_BUILD_ID})..."
VERIFY_OK=0
for _try in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  HTML="$(curl -fsS --max-time 5 http://127.0.0.1:3000/trip-builder 2>/dev/null || true)"
  CHUNK="$(printf '%s' "$HTML" | grep -oE 'trip-builder/page-[a-f0-9]+\.js' | head -1 || true)"
  if [[ -n "$CHUNK" && -f ".next/static/chunks/app/${CHUNK}" ]]; then
    echo "==> Runtime serves ${CHUNK} (on disk) — OK"
    VERIFY_OK=1
    break
  fi
  echo "==> verify attempt ${_try}: chunk='${CHUNK:-none}' not on disk yet..."
done
if [[ "$VERIFY_OK" != "1" ]]; then
  echo "==> FATAL: :3000 still serving stale/missing trip-builder chunk after restart." >&2
  echo "    Expected files under .next/static/chunks/app/trip-builder/:" >&2
  ls -la .next/static/chunks/app/trip-builder/ >&2 || true
  echo "    Recent safartrip logs:" >&2
  pm2 logs safartrip --lines 30 --nostream >&2 || true
  exit 1
fi

echo "==> Done (deploy-safe). BUILD_ID=${EXPECTED_BUILD_ID}"
