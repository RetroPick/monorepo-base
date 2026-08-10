#!/usr/bin/env bash
# Start Markets V1 full Docker dev stack (Postgres + markets-api migrate/seed + apps/web).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.markets-dev.yml"
COMPOSE=(docker compose -f "$COMPOSE_FILE")

MARKETS_BFF_URL="${MARKETS_BFF_URL:-http://127.0.0.1:8080}"
MARKETS_WEB_URL="${MARKETS_WEB_URL:-http://localhost:3001}"
WAIT_TIMEOUT_SEC="${WAIT_TIMEOUT_SEC:-180}"
BUILD=0

export DOCKER_BUILDKIT=1
export COMPOSE_BAKE=true

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: markets-dev-up.sh [--build]

  --build   Force image rebuild (first run or after code changes)
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    die "docker CLI not found. Install Docker Desktop (WSL integration) or docker.io."
  fi
  if ! docker info >/dev/null 2>&1; then
    cat >&2 <<'EOF'
error: Docker daemon is not running.

WSL2:
  1. Start Docker Desktop on Windows
  2. Settings → Resources → WSL Integration → enable for this distro
  3. Verify: docker info

Native Linux:
  sudo service docker start
EOF
    exit 1
  fi
}

check_port() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn "( sport = :$port )" 2>/dev/null | grep -q ":$port"; then
      die "port $port is already in use. Stop the conflicting process or override compose ports."
    fi
  fi
}

wait_for_json() {
  local url="$1"
  local label="$2"
  local deadline=$((SECONDS + WAIT_TIMEOUT_SEC))
  while (( SECONDS < deadline )); do
    if curl -fsS "$url" | head -c 1 | grep -q '{'; then
      return 0
    fi
    sleep 2
  done
  die "timed out waiting for $label at $url (${WAIT_TIMEOUT_SEC}s)"
}

while (($# > 0)); do
  case "$1" in
    --build)
      BUILD=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1 (try --help)"
      ;;
  esac
done

if [[ "${MARKETS_STACK_BUILD:-}" == "1" ]]; then
  BUILD=1
fi

require_docker

for port in 5433 8080 3001; do
  check_port "$port"
done

if (( BUILD )); then
  printf '==> Building and starting Markets dev stack\n'
  "${COMPOSE[@]}" up --build -d
else
  printf '==> Starting Markets dev stack (reuse images; pass --build after code changes)\n'
  "${COMPOSE[@]}" up -d
fi

printf '==> Waiting for BFF catalog JSON at %s/api/v1/markets/events\n' "$MARKETS_BFF_URL"
wait_for_json "${MARKETS_BFF_URL}/api/v1/markets/events" "markets events"

printf '==> Waiting for web at %s/markets\n' "$MARKETS_WEB_URL"
deadline=$((SECONDS + WAIT_TIMEOUT_SEC))
while (( SECONDS < deadline )); do
  if curl -fsS -o /dev/null "${MARKETS_WEB_URL}/markets"; then
    break
  fi
  sleep 2
done
if (( SECONDS >= deadline )); then
  die "timed out waiting for markets web (${WAIT_TIMEOUT_SEC}s)"
fi

cat <<EOF

Markets dev stack is ready.

  Discover:     ${MARKETS_WEB_URL}/markets
  BFF live:     ${MARKETS_BFF_URL}/api/v1/health/live
  Capabilities: ${MARKETS_BFF_URL}/api/v1/markets/capabilities
  Events:       ${MARKETS_BFF_URL}/api/v1/markets/events

Teardown:  pnpm dev:markets-stack:down
Smoke:     pnpm smoke:markets-stack
Logs:      retro stack markets logs
Status:    retro stack markets status
Rebuild:   pnpm dev:markets-stack -- --build

EOF
