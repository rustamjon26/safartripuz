#!/bin/bash
set -euo pipefail
ENV_FILE="/var/www/safar/.env"
if grep -q '^PAYME_SECRET_KEY=7PhyUnkw5BKHwpxkoVO#HDv0wBsBQTG5iaZq$' "$ENV_FILE"; then
  sed -i 's/^PAYME_SECRET_KEY=7PhyUnkw5BKHwpxkoVO#HDv0wBsBQTG5iaZq$/PAYME_SECRET_KEY="7PhyUnkw5BKHwpxkoVO#HDv0wBsBQTG5iaZq"/' "$ENV_FILE"
  cp "$ENV_FILE" /var/www/safar/.next/standalone/.env
  cp "$ENV_FILE" /var/www/safar/standalone/.env 2>/dev/null || true
  echo "Quoted PAYME_SECRET_KEY and synced .env copies"
else
  echo "PAYME_SECRET_KEY already quoted or different"
fi
