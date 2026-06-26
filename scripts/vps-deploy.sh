#!/usr/bin/env bash
# Runs ON THE VPS after git pull. Called by GitHub Actions over SSH.
# Bare Node + PM2 (no Docker).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/delala}"

cd "$APP_DIR"

echo "==> Pulling latest code..."
git fetch origin main
git reset --hard origin/main

cd backend

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not installed. Run scripts/vps-setup.sh on the server first."
  exit 1
fi

if ! command -v pm2 &>/dev/null; then
  echo "ERROR: PM2 not installed. Run scripts/vps-setup.sh on the server first."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: Missing $APP_DIR/backend/.env — create it on the server (never commit secrets)."
  exit 1
fi

echo "==> Installing production dependencies..."
npm ci --omit=dev

mkdir -p logs

echo "==> Restarting PM2 processes..."
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "==> Health check..."
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PORT:-5000}/api/v1/health" >/dev/null; then
    echo "API is healthy."
    pm2 status
    exit 0
  fi
  sleep 2
done

echo "ERROR: API health check failed."
pm2 logs delala-api --lines 80 --nostream
exit 1
