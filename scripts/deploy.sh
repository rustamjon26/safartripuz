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

echo "Restarting PM2..."
pm2 restart safartrip

echo "Done!"
