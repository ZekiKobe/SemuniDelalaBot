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
rm -f /etc/nginx/conf.d/default.conf

nginx -t
systemctl reload nginx

echo ""
echo "Nginx ready. Test on the server:"
echo "  curl http://127.0.0.1/api/v1/health"
echo "  curl http://127.0.0.1/health"
