#!/bin/sh
# docker-entrypoint.dev.sh
#
# Shared dev entrypoint for DB-backed services (upload, processing, report).
# api-gateway is stateless and does NOT use this script.
#
# Responsibilities:
#   1. Wait until Postgres is accepting connections.
#   2. Optionally run TypeORM migrations when RUN_MIGRATIONS=true
#      (currently apps use synchronize:true so no migration files exist yet;
#       this is future-proofing for when synchronize is disabled in staging/prod).
#   3. Hand off to CMD via exec "$@" so signals are forwarded correctly.

set -e

# ---------------------------------------------------------------------------
# 1. Wait for Postgres readiness
# ---------------------------------------------------------------------------
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-fiap}"

echo "[entrypoint] Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT} ..."

RETRIES=30
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -q; do
  RETRIES=$((RETRIES - 1))
  if [ "${RETRIES}" -eq 0 ]; then
    echo "[entrypoint] ERROR: Postgres did not become ready in time. Exiting."
    exit 1
  fi
  echo "[entrypoint] Postgres not ready yet — retrying in 2 s (${RETRIES} attempts left) ..."
  sleep 2
done

echo "[entrypoint] Postgres is ready."

# ---------------------------------------------------------------------------
# 2. Conditionally run TypeORM migrations
#    Set RUN_MIGRATIONS=true and TYPEORM_DATASOURCE=<path-to-datasource-file>
#    in the service environment when migration files exist.
# ---------------------------------------------------------------------------
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  DATASOURCE="${TYPEORM_DATASOURCE:-}"
  if [ -n "${DATASOURCE}" ] && [ -f "${DATASOURCE}" ]; then
    echo "[entrypoint] Running TypeORM migrations from datasource: ${DATASOURCE}"
    npx typeorm migration:run -d "${DATASOURCE}"
    echo "[entrypoint] Migrations completed."
  else
    echo "[entrypoint] RUN_MIGRATIONS=true but no datasource file found at '${DATASOURCE}'. Skipping migrations."
  fi
else
  echo "[entrypoint] RUN_MIGRATIONS is not set to 'true'. Skipping migrations (synchronize:true handles schema in dev)."
fi

# ---------------------------------------------------------------------------
# 3. Execute the CMD passed to this container (e.g., npm run start:upload-service)
# ---------------------------------------------------------------------------
echo "[entrypoint] Starting: $*"
exec "$@"
