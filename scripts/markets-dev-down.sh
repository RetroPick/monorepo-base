#!/usr/bin/env bash
# Stop Markets V1 Docker dev stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.markets-dev.yml"

REMOVE_VOLUMES=0
for arg in "$@"; do
  case "$arg" in
    -v|--volumes) REMOVE_VOLUMES=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: markets-dev-down.sh [-v|--volumes]

  -v, --volumes   Remove Postgres volume (fresh seed on next up)
EOF
      exit 0
      ;;
  esac
done

if (( REMOVE_VOLUMES )); then
  docker compose -f "$COMPOSE_FILE" down -v
else
  docker compose -f "$COMPOSE_FILE" down
fi

printf 'Markets dev stack stopped.\n'
