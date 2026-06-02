#!/bin/bash
set -e
echo "=== SafarTrip Deploy ==="

cd /var/www/safar

echo "1. Git pull..."
git pull origin main

echo "2. Install dependencies..."
npm ci --production=false

echo "3. Generate Prisma client..."
npx prisma generate

echo "4. Run migrations..."
npx prisma migrate deploy

echo "5. Build Next.js..."
if [ -z "${NODE_OPTIONS:-}" ]; then
  export NODE_OPTIONS="--max-old-space-size=4096"
fi
npm run build

echo "5b. Verify static assets (hero + favicon)..."
if [ ! -f public/hero-bg.png ]; then
  echo "ERROR: public/hero-bg.png missing — git pull / LFS?"
  exit 1
fi
if [ ! -f public/favicon.ico ] && [ ! -f app/favicon.ico ]; then
  echo "ERROR: no favicon in public/ or app/"
  exit 1
fi

echo "6. Restart PM2..."
pm2 reload ecosystem.config.js --env production

echo "=== Deploy complete! ==="
pm2 status
