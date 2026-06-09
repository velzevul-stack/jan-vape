#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

bash scripts/wait-postgres.sh

export NODE_ENV=production
export PORT="${PORT:-3000}"

echo "[jan-vape] Starting Next.js on port ${PORT}..."
exec node node_modules/next/dist/bin/next start
