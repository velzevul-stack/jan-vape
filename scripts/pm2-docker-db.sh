#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [ -f .env.docker ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.docker
  set +a
fi

echo "[jan-vape-db] Starting PostgreSQL container..."
docker compose -f docker-compose.prod.yml up -d

bash scripts/wait-postgres.sh

echo "[jan-vape-db] Container running, holding PM2 slot..."
exec tail -f /dev/null
