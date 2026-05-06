#!/bin/bash
# SafarTrip — one-time server bootstrap for Ubuntu 22.04 (run as root).
# Usage:  sudo bash scripts/setup-server.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "=== SafarTrip Server Setup ==="

# 1. System update
apt-get update
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  gnupg \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw \
  fail2ban

# 2. Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

# 3. PM2 (global; run app as www-data)
npm install -g pm2
# Generates systemd unit so PM2 restarts on boot for user www-data
pm2 startup systemd -u www-data --hp /var/www || true
echo "If pm2 startup printed a command, run it once (as root) to enable the systemd service."

# 4. MySQL 8
apt-get install -y mysql-server
systemctl enable --now mysql

# mysql_secure_installation is interactive; harden MySQL in a follow-up session:
#   sudo mysql_secure_installation
# Then create DB and app user, e.g. (after editing the password in the file):
#   sudo mysql < /var/www/safartrip/scripts/setup-mysql.sql
# Or run the SQL in scripts/setup-mysql.sql manually.
echo "[MySQL] Server installed. Create database and user with: scripts/setup-mysql.sql (see README or deploy notes)."

# 5. Project and log directories
mkdir -p /var/www/safartrip
mkdir -p /var/log/safartrip
chown -R www-data:www-data /var/www/safartrip
chown -R www-data:www-data /var/log/safartrip

# 6. Firewall
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable
ufw status verbose || true

# 7. Nginx: disable default site if present, add SafarTrip vhost
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

cat > /etc/nginx/sites-available/safartrip << 'NGINX_EOF'
server {
    listen 80;
    server_name safartrip.uz www.safartrip.uz;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Next.js static files (from project root .next; adjust after first build)
    location /_next/static/ {
        alias /var/www/safartrip/.next/static/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Next.js (PM2 on port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/safartrip /etc/nginx/sites-enabled/safartrip
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# Fail2ban: ensure enabled
systemctl enable --now fail2ban

echo "=== Server setup complete! ==="
echo "Next steps:"
echo "1. Point safartrip.uz DNS to this server IP"
echo "2. Harden MySQL:  sudo mysql_secure_installation"
echo "3. Create DB/user: edit scripts/setup-mysql.sql (password), then:  sudo mysql < /path/to/scripts/setup-mysql.sql"
echo "4. Clone repo:     sudo -u www-data git clone <repo> /var/www/safartrip  # or deploy as you prefer"
echo "5. In /var/www/safartrip: copy .env.production, set DATABASE_URL and secrets"
echo "6. Build & migrate:  sudo -u www-data -H bash -lc 'cd /var/www/safartrip && npm ci && npx prisma generate && npx prisma migrate deploy && npm run build'"
echo "7. PM2:            sudo -u www-data -H bash -lc 'cd /var/www/safartrip && pm2 start ecosystem.config.js --env production && pm2 save'"
echo "8. TLS:            sudo certbot --nginx -d safartrip.uz -d www.safartrip.uz"
echo "9. (Optional) If pm2 startup printed a sudo env ... line, run it so PM2 restarts on reboot."
