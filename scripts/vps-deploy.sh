#!/usr/bin/env bash
# Runs ON THE VPS after git pull. Called by GitHub Actions over SSH.
# Bare Node + PM2 (no Docker).
#
# DEPLOY_MODE=full  — API + bot (default)
# DEPLOY_MODE=bot   — Telegram bot only
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/delala}"
DEPLOY_MODE="${DEPLOY_MODE:-full}"

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

echo "==> Restarting PM2 (mode: $DEPLOY_MODE)..."
if [[ "$DEPLOY_MODE" == "bot" ]]; then
  pm2 startOrReload ecosystem.bot.config.js --env production
  pm2 save

  echo "==> Health check (bot)..."
  for i in {1..15}; do
    if pm2 describe delala-bot 2>/dev/null | grep -q "status.*online"; then
      echo "Bot is online."
      pm2 status
      exit 0
    fi
    sleep 2
  done

  echo "ERROR: Bot failed to start."
  pm2 logs delala-bot --lines 80 --nostream
  exit 1
fi

pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "==> Health check (API + bot)..."
echo "    (API may take 20-40s to listen while MongoDB connects on first start)"

api_ok=false
bot_ok=false
health_port="${PORT:-5000}"
if [[ -f .env ]]; then
  env_port="$(grep -E '^PORT=' .env | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
  if [[ -n "${env_port:-}" ]]; then
    health_port="$env_port"
  fi
fi

sleep 5

for i in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${health_port}/api/v1/health" >/dev/null 2>&1; then
    api_ok=true
    echo "    API ready (attempt $i)."
    break
  fi
  if (( i % 5 == 0 )); then
    echo "    Still waiting for API... (${i}/45)"
  fi
  sleep 2
done

for i in $(seq 1 10); do
  if pm2 describe delala-bot 2>/dev/null | grep -q "status.*online"; then
    bot_ok=true
    break
  fi
  sleep 1
done

if [[ "$api_ok" == true && "$bot_ok" == true ]]; then
  echo "API and bot are healthy."
  pm2 status
  exit 0
fi

echo "ERROR: Deploy health check failed (api=$api_ok, bot=$bot_ok)."
pm2 logs delala-api --lines 40 --nostream
pm2 logs delala-bot --lines 40 --nostream
exit 1
