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

echo "==> Pulling latest..."
git pull

echo "==> Installing dependencies..."
npm ci || npm install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying migrations (prefer migrate deploy over db:push)..."
npx prisma migrate deploy

echo "==> Typecheck + lint + unit tests..."
npm run typecheck
npm run lint
npm run test:unit

# Tradeoff: stopping PM2 (and optionally MySQL) during build frees RAM on ~8 GB hosts so
# the Next.js webpack worker can finish. Cost: the site is DOWN for the whole build
# window (and DB is briefly unavailable if MySQL is stopped). On a fresh Contabo box
# that has never served traffic successfully, that cost is acceptable; on a busy
# production host, prefer a larger machine or a blue/green build directory instead.
echo "==> Stopping PM2 apps to free RAM for build..."
pm2 stop all || true

STOP_MYSQL_FOR_BUILD="${STOP_MYSQL_FOR_BUILD:-1}"
MYSQL_WAS_STOPPED=0
if [[ "$STOP_MYSQL_FOR_BUILD" == "1" ]]; then
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mysql 2>/dev/null; then
    echo "==> Stopping MySQL for build (set STOP_MYSQL_FOR_BUILD=0 to skip)..."
    systemctl stop mysql
    MYSQL_WAS_STOPPED=1
  elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mysqld 2>/dev/null; then
    echo "==> Stopping MySQL (mysqld) for build (set STOP_MYSQL_FOR_BUILD=0 to skip)..."
    systemctl stop mysqld
    MYSQL_WAS_STOPPED=1
  fi
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

echo "==> Reloading PM2 (prefer reload over hard restart)..."
pm2 reload safartrip --update-env || pm2 restart safartrip --update-env || pm2 start ecosystem.config.js
# Outbox + expire-holds if present in ecosystem
pm2 reload safartrip-outbox --update-env 2>/dev/null || true
pm2 restart safartrip-expire-holds --update-env 2>/dev/null || true

echo "==> Done (deploy-safe)."
