#!/bin/bash
set -e

echo "Pulling latest changes..."
cd /var/www/safar
git pull

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing DB schema..."
npm run db:push

echo "Building..."
npm run build

echo "Copying standalone assets..."
cp -r .next/standalone ./standalone
cp -r .next/static ./standalone/.next/static
cp -r public ./standalone/public
cp .env ./standalone/.env
if [ -f .env.local ]; then
  cp .env.local ./standalone/.env.local
fi

echo "Restarting PM2..."
pm2 restart safartrip --update-env

echo "Done!"
