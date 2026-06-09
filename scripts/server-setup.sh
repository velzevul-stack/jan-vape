#!/usr/bin/env bash
# server-setup.sh — one-time server setup: PostgreSQL + Node + PM2
# Run as root (or with sudo) on a fresh Ubuntu/Debian server.
# Usage: sudo bash scripts/server-setup.sh

set -euo pipefail

APP_USER="janvape"
APP_DIR="/var/www/jan-vape-suite"
PG_USER="jan"
PG_DB="jan_vape"

echo "==> 1. System packages"
apt-get update -q
apt-get install -y curl ca-certificates gnupg lsb-release

echo "==> 2. PostgreSQL 16"
if ! command -v psql &>/dev/null; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  echo "deb [signed-by=/etc/apt/trusted.gpg.d/postgresql.gpg] \
    https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -q
  apt-get install -y postgresql-16
else
  echo "   PostgreSQL already installed, skipping"
fi

systemctl enable postgresql
systemctl start postgresql

echo "==> 3. Create DB user and database"
PG_PASS=$(openssl rand -base64 24 | tr -d '/+=')

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" \
  | grep -q 1 || sudo -u postgres psql -c \
  "CREATE USER ${PG_USER} WITH PASSWORD '${PG_PASS}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" \
  | grep -q 1 || sudo -u postgres createdb -O "${PG_USER}" "${PG_DB}"

DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}"
echo "   DATABASE_URL=${DATABASE_URL}"
echo "${DATABASE_URL}" > /root/pg-database-url.txt
chmod 600 /root/pg-database-url.txt
echo "   Saved to /root/pg-database-url.txt"

echo "==> 4. Node.js 22 (via NodeSource)"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "   Node.js already installed: $(node -v)"
fi

echo "==> 5. PM2"
npm install -g pm2 2>/dev/null || true
pm2 startup systemd -u "${APP_USER:-root}" --hp "/home/${APP_USER:-root}" 2>/dev/null || true

echo ""
echo "=========================================================="
echo " Server setup complete."
echo " Next steps:"
echo ""
echo "   1. Copy .env.local.server to ${APP_DIR}/.env.local"
echo "      and set DATABASE_URL from /root/pg-database-url.txt"
echo ""
echo "   2. Run scripts/deploy.sh to build and start the app"
echo "=========================================================="
