#!/usr/bin/env bash
# Deterministic Markets V1 local stack: PostgreSQL projection → Go markets-api → fe-v1.
# Browser traffic must hit RetroPick BFF only (no upstream Polymarket hosts).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCENARIO="${1:-populated}"
DATABASE_URL="${DATABASE_URL:-postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable}"
MARKETS_HTTP_PORT="${MARKETS_HTTP_PORT:-8090}"
VITE_API_URL="${VITE_API_URL:-http://127.0.0.1:${MARKETS_HTTP_PORT}}"

echo "==> Starting PostgreSQL (docker compose)"
docker compose -f "$ROOT/docker-compose.yml" up -d postgres

echo "==> Waiting for PostgreSQL"
for _ in $(seq 1 30); do
  if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U retropick -d retropick >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export DATABASE_URL
echo "==> Seeding projection scenario=${SCENARIO}"
go -C "$ROOT/apps/backend" run ./cmd/markets-seed -scenario "$SCENARIO"

echo "==> Starting markets-api on :${MARKETS_HTTP_PORT}"
export MARKETS_HTTP_PORT
export MARKETS_CATALOG_ENABLED=1
export MARKETS_MARKET_DATA_ENABLED=0
export MARKETS_SIGNALS_ENABLED=1
export GAMMA_API_URL=http://127.0.0.1:9
export CLOB_API_URL=http://127.0.0.1:9

go -C "$ROOT/apps/backend" run ./cmd/markets-api &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT

sleep 2
curl -fsS "http://127.0.0.1:${MARKETS_HTTP_PORT}/api/v1/health/live" >/dev/null

echo "==> Starting fe-v1 (Vite) with VITE_API_URL=${VITE_API_URL}"
export VITE_API_URL
pnpm --dir "$ROOT/apps/fe-v1" dev:vite --host 127.0.0.1 --port 5173
