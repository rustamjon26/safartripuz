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

echo "==> Building..."
NODE_OPTIONS=--max-old-space-size=8192 npm run build

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
pm2 reload safartrip --update-env || pm2 restart safartrip --update-env
# Outbox + expire-holds if present in ecosystem
pm2 reload safartrip-outbox --update-env 2>/dev/null || true
pm2 restart safartrip-expire-holds --update-env 2>/dev/null || true

echo "==> Done (deploy-safe)."
