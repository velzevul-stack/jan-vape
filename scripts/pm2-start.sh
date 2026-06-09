#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

bash scripts/wait-postgres.sh

export NODE_ENV=production
export PORT="${PORT:-3000}"

NEXT_BIN="${ROOT}/node_modules/next/dist/bin/next"
if [ ! -f "${NEXT_BIN}" ]; then
  echo "ERROR: Next.js not built. Run: npm run build" >&2
  exit 1
fi

echo "[jan-vape] Starting Next.js on port ${PORT}..."
exec /usr/bin/env node "${NEXT_BIN}" start
