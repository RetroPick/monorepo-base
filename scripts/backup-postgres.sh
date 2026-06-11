#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_dir="${1:-./backups}"
mkdir -p "${output_dir}"

"$(dirname "$0")/compose-production.sh" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc \
  > "${output_dir}/retropick-${timestamp}.dump"

echo "wrote ${output_dir}/retropick-${timestamp}.dump"
