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

if [[ "$STOP_MYSQL_FOR_BUILD" == "1" ]]; then
  # MySQL down → workers will fail; stop the full PM2 set.
  echo "==> Stopping all PM2 apps (MySQL will stop for build)..."
  pm2 stop all || true
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mysql 2>/dev/null; then
    echo "==> Stopping MySQL for build (set STOP_MYSQL_FOR_BUILD=0 to skip)..."
    systemctl stop mysql
    MYSQL_WAS_STOPPED=1
  elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mysqld 2>/dev/null; then
    echo "==> Stopping MySQL (mysqld) for build (set STOP_MYSQL_FOR_BUILD=0 to skip)..."
    systemctl stop mysqld
    MYSQL_WAS_STOPPED=1
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

if [[ "$MYSQL_WAS_STOPPED" == "1" ]]; then
  echo "==> Starting MySQL after build..."
  systemctl start mysql 2>/dev/null || systemctl start mysqld
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

# Always restart (not reload): reload on a stopped process fails and was previously
# swallowed for outbox (`|| true`), leaving workers down after deploy.
echo "==> Restarting PM2 apps: ${PM2_APPS[*]} ..."
if ! pm2 restart "${PM2_APPS[@]}" --update-env; then
  echo "==> restart failed — starting from ecosystem.config.js ..."
  pm2 start ecosystem.config.js
  pm2 restart "${PM2_APPS[@]}" --update-env
fi
pm2 save

echo "==> PM2 status:"
pm2 status

echo "==> Done (deploy-safe)."
