#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "Removing stale PM2 processes (jan-vape, jan-vape-db)..."
pm2 delete jan-vape 2>/dev/null || true
pm2 delete jan-vape-db 2>/dev/null || true

echo "Starting from ecosystem.config.js..."
pm2 start ecosystem.config.js

pm2 save
pm2 list

echo ""
echo "Logs: pm2 logs jan-vape --lines 30"
