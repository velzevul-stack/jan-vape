#!/usr/bin/env bash
# deploy.sh — pull, build, init DB schema, restart via PM2
# Run from the app directory: bash scripts/deploy.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${APP_DIR}"

echo "==> Working directory: ${APP_DIR}"

if [ ! -f .env.docker ]; then
  echo "ERROR: .env.docker not found. Copy .env.docker.example and set POSTGRES_PASSWORD." >&2
  exit 1
fi

echo "==> 1. Pull latest"
git pull --ff-only

echo "==> 2. Install dependencies"
npm ci --prefer-offline

echo "==> 3. PostgreSQL (Docker) + schema"
bash scripts/db-init-prod.sh

echo "==> 4. Build Next.js"
NODE_ENV=production npm run build

echo "==> 5. Start / reload PM2 (db + app)"
if pm2 list | grep -q 'jan-vape'; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "Done. Postgres: docker compose -f docker-compose.prod.yml ps"
echo "App: http://localhost:3000"
pm2 list
