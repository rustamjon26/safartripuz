#!/bin/bash
set -euo pipefail

CONF="/etc/nginx/sites-available/safartrip"

if grep -q 'proxy_set_header Authorization' "$CONF"; then
  echo "Authorization header already configured"
else
  sed -i '/proxy_set_header Host \$host;/a\        proxy_set_header Authorization $http_authorization;' "$CONF"
  echo "Added Authorization header pass-through"
fi

nginx -t
systemctl reload nginx
echo "Nginx reloaded"
