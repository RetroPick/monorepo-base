#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

dump_file="${1:?usage: scripts/restore-postgres.sh <dump-file>}"

"$(dirname "$0")/compose-production.sh" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists \
  < "${dump_file}"

echo "restored ${dump_file}"
