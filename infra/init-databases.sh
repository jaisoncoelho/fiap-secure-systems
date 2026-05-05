#!/bin/bash
set -e

# Creates per-service databases on the shared Postgres instance.
# Runs once on first container start via docker-entrypoint-initdb.d.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE fiap_upload;
    CREATE DATABASE fiap_processing;
    CREATE DATABASE fiap_report;
    GRANT ALL PRIVILEGES ON DATABASE fiap_upload TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE fiap_processing TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE fiap_report TO $POSTGRES_USER;
EOSQL
