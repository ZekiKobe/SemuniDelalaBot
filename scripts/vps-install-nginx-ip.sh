#!/usr/bin/env bash
# Install HTTP-only nginx config for VPS without a domain (Option B).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/delala}"
SITE_NAME="${SITE_NAME:-delala}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

if [[ ! -f "$APP_DIR/backend/nginx.conf.ip-only" ]]; then
  echo "Missing $APP_DIR/backend/nginx.conf.ip-only — clone the repo first."
  exit 1
fi

cp "$APP_DIR/backend/nginx.conf.ip-only" "/etc/nginx/sites-available/$SITE_NAME"
ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "Nginx ready. Test: curl http://$(curl -4 -s ifconfig.me 2>/dev/null || echo YOUR_VPS_IP)/api/v1/health"
