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

PM2_APPS=(safartrip safartrip-outbox safartrip-expire-holds)

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

echo "==> Typecheck + unit tests..."
npm run typecheck
npm run test:unit

# Lint is intentionally NON-blocking here — matches CI (.github/workflows/ci.yml):
# eslint still has large pre-existing debt on main; a hard fail aborts deploy after
# migrate and leaves PM2 on the old build. Re-enable only after `npm run lint` is green.
if npm run lint; then
  echo "==> Lint: clean"
else
  echo "==> Lint: FAILED (non-blocking — see CI note; continuing deploy)" >&2
fi

# Tradeoff: stopping the Next.js app (and optionally MySQL + workers) during build
# frees RAM on ~8 GB hosts. Cost: site DOWN for the build window.
STOP_MYSQL_FOR_BUILD="${STOP_MYSQL_FOR_BUILD:-1}"
MYSQL_WAS_STOPPED=0
MYSQL_UNIT=""

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

if [[ "$STOP_MYSQL_FOR_BUILD" == "1" ]]; then
  # MySQL down → workers will fail; stop the full PM2 set.
  echo "==> Stopping all PM2 apps (MySQL may stop for build)..."
  pm2 stop all || true

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
  sleep 1
elif command -v ss >/dev/null 2>&1; then
  # Best-effort: show leftover listeners (manual kill if fuser absent).
  ss -lptn 'sport = :3000' || true
fi

echo "==> Starting PM2 apps: ${PM2_APPS[*]} ..."
if ! pm2 start "${PM2_APPS[@]}" --update-env 2>/dev/null; then
  echo "==> start by name failed — starting from ecosystem.config.js ..."
  pm2 start ecosystem.config.js
  pm2 restart "${PM2_APPS[@]}" --update-env
fi
pm2 save

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
