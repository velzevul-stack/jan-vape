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

PG_USER="${POSTGRES_USER:-jan}"
PG_DB="${POSTGRES_DB:-jan_vape}"

bash scripts/wait-postgres.sh

echo "Applying scripts/init-db.sql..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${PG_USER}" -d "${PG_DB}" -f - < scripts/init-db.sql

for sql in scripts/migrate-*.sql; do
  echo "Applying ${sql}..."
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "${PG_USER}" -d "${PG_DB}" -f - < "${sql}" 2>/dev/null || true
done

echo "DB schema applied."
