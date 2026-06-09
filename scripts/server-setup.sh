#!/usr/bin/env bash
# server-setup.sh — one-time server setup: Docker + Node + PM2
# Usage: sudo bash scripts/server-setup.sh

set -euo pipefail

echo "==> 1. System packages"
apt-get update -q
apt-get install -y curl ca-certificates gnupg lsb-release

echo "==> 2. Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
else
  echo "   Docker already installed: $(docker --version)"
fi

systemctl enable docker
systemctl start docker

echo "==> 3. Node.js 22 (via NodeSource)"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "   Node.js already installed: $(node -v)"
fi

echo "==> 4. PM2"
npm install -g pm2 2>/dev/null || true
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================================="
echo " Server setup complete."
echo ""
echo " Next steps (in app directory):"
echo "   1. cp .env.docker.example .env.docker"
echo "      set POSTGRES_PASSWORD (same as in .env.local DATABASE_URL)"
echo "   2. cp .env.local.server .env.local and fill secrets"
echo "   3. bash scripts/deploy.sh"
echo "=========================================================="
