#!/usr/bin/env bash
# deploy.sh — pull, build, init DB schema, restart via PM2
# Run from the app directory: bash scripts/deploy.sh
# Can also be used as a deploy hook (Capistrano-style or manually).

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${APP_DIR}"

echo "==> Working directory: ${APP_DIR}"

echo "==> 1. Pull latest"
git pull --ff-only

echo "==> 2. Install dependencies"
npm ci --prefer-offline

echo "==> 3. Init DB schema (idempotent)"
if [ -f ".env.local" ]; then
  DB_URL=$(grep '^DATABASE_URL=' .env.local | cut -d '=' -f2-)
  if [ -n "${DB_URL}" ]; then
    echo "   Applying scripts/init-db.sql..."
    psql "${DB_URL}" -f scripts/init-db.sql
    echo "   Running incremental migrations..."
    for sql in scripts/migrate-*.sql; do
      echo "     ${sql}"
      psql "${DB_URL}" -f "${sql}" 2>/dev/null || true
    done
  else
    echo "   WARNING: DATABASE_URL not found in .env.local, skipping DB init"
  fi
else
  echo "   WARNING: .env.local not found, skipping DB init"
fi

echo "==> 4. Build Next.js"
NODE_ENV=production npm run build

echo "==> 5. Start / reload PM2"
if pm2 list | grep -q 'jan-vape'; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "Done. App running at http://localhost:3000"
pm2 list
