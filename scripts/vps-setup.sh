#!/usr/bin/env bash
# One-time VPS bootstrap: Node 20 + PM2 + nginx (no Docker).
# Run as root on Ubuntu 22.04/24.04.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/delala}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/www/delala/uploads}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

echo "==> Installing system packages..."
apt-get update
apt-get install -y ca-certificates curl git nginx ufw build-essential

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "==> Creating deploy user..."
id -u "$DEPLOY_USER" &>/dev/null || useradd -m -s /bin/bash "$DEPLOY_USER"

echo "==> Preparing directories..."
mkdir -p "$APP_DIR" "$UPLOADS_DIR" "/home/$DEPLOY_USER/.ssh"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR" "/home/$DEPLOY_USER/.ssh"
chmod 700 "/home/$DEPLOY_USER/.ssh"
chown -R "$DEPLOY_USER:www-data" /var/www/delala
chmod -R 775 "$UPLOADS_DIR"

if [[ ! -f /swapfile ]]; then
  echo "==> Adding 2G swap (recommended for 1GB RAM)..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx HTTP'
ufw --force enable

echo ""
echo "Bootstrap complete."
echo ""
echo "Next steps (run in order):"
echo ""
echo "  1. SSH keys for deploy user"
echo "     - Your laptop key  -> /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "     - GitHub Actions   -> add deploy key public part to authorized_keys too"
echo "     chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "     chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh"
echo ""
echo "  2. Clone repo (as deploy user):"
echo "     sudo -u $DEPLOY_USER git clone https://github.com/ZekiKobe/SemuniDelalaBot.git $APP_DIR"
echo ""
echo "  3. Create production .env:"
echo "     sudo -u $DEPLOY_USER nano $APP_DIR/backend/.env"
echo "     Required: MONGODB_URI, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_ADMIN_CHAT_ID"
echo "     Bot-only: no API_URL/nginx needed"
echo "     Full stack: API_URL=http://YOUR_VPS_IP, UPLOAD_DIR=$UPLOADS_DIR, LOG_DIR=$APP_DIR/backend/logs"
echo ""
echo "  4. (Full stack only) Install nginx:"
echo "     sudo APP_DIR=$APP_DIR bash $APP_DIR/scripts/vps-install-nginx-ip.sh"
echo ""
echo "  5. First deploy:"
echo "     sudo -u $DEPLOY_USER bash $APP_DIR/scripts/vps-deploy.sh"
echo "     # or full: sudo -u $DEPLOY_USER DEPLOY_MODE=full bash $APP_DIR/scripts/vps-deploy.sh"
echo ""
echo "  6. PM2 on reboot (run once after step 5):"
echo "     sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER"
echo "     sudo -u $DEPLOY_USER pm2 save"
echo ""
echo "  7. GitHub Actions secrets:"
echo "     VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_APP_DIR=$APP_DIR"
echo "     VPS_DEPLOY_MODE=bot  (or full for API + bot)"
