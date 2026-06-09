#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

COMPOSE_FILE="docker-compose.prod.yml"

if [ -f .env.docker ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.docker
  set +a
fi

PG_USER="${POSTGRES_USER:-jan}"
PG_DB="${POSTGRES_DB:-jan_vape}"

if ! docker compose -f "${COMPOSE_FILE}" ps --status running postgres 2>/dev/null | grep -q postgres; then
  docker compose -f "${COMPOSE_FILE}" up -d
fi

echo "Waiting for PostgreSQL (${PG_USER}@${PG_DB})..."
for _ in $(seq 1 60); do
  if docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    pg_isready -U "${PG_USER}" -d "${PG_DB}" >/dev/null 2>&1; then
    echo "PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done

echo "ERROR: PostgreSQL did not become ready within 60s" >&2
exit 1
