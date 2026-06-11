#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${RETROPICK_ENV_FILE:-$root/.env.production}"
compose_file="${RETROPICK_COMPOSE_FILE:-$root/docker-compose.production.yml}"

cd "$root"
exec docker compose --env-file "${env_file}" -f "${compose_file}" "$@"
