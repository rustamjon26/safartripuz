#!/bin/bash
set -e

echo "Pulling latest changes..."
cd /var/www/safar
git pull

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Applying migrations (migrate deploy — never db push on production)..."
npx prisma migrate deploy

echo "Building..."
npm run build

echo "Copying standalone assets..."
cp -r .next/standalone ./standalone
cp -r .next/static ./standalone/.next/static
cp -r public ./standalone/public
cp .env ./standalone/.env
cp .env ./.next/standalone/.env
if [ -f .env.local ]; then
  cp .env.local ./standalone/.env.local
  cp .env.local ./.next/standalone/.env.local
fi

echo "Restarting PM2..."
# Plain `pm2 restart` can report online while the new process dies with
# EADDRINUSE and an orphan keeps serving the old build.
pm2 stop safartrip || true
sleep 1
if command -v fuser >/dev/null 2>&1; then
  echo "Freeing TCP :3000 if still held..."
  fuser -k 3000/tcp 2>/dev/null || true
fi
for _wait in 1 2 3 4 5 6 7 8 9 10; do
  if ! ss -lptn 'sport = :3000' 2>/dev/null | grep -q ':3000'; then
    break
  fi
  echo ":3000 still busy (wait ${_wait}/10); killing again..."
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 1
done
if ss -lptn 'sport = :3000' 2>/dev/null | grep -q ':3000'; then
  echo "FATAL: could not free TCP :3000 before start." >&2
  ss -lptn 'sport = :3000' >&2 || true
  exit 1
fi
pm2 start safartrip --update-env || pm2 restart safartrip --update-env
sleep 3
pm2 status

echo "Done!"
