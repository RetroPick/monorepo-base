#!/usr/bin/env bash
# Fail CI when the active tree references retired pre-Markets runtime paths/tooling.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RG_EXCLUDES=(
  --glob '!archive/**'
  --glob '!references/**'
  --glob '!.harness/tasks/done/**'
  --glob '!.harness/products/markets-v1/evidence/**'
  --glob '!.dev/prompt/**'
  --glob '!docs/archive/**'
  --glob '!docs/engineering/adr/**'
  --glob '!scripts/check-active-legacy-refs.sh'
  --glob '!AGENTS.md'
  --glob '!DECISIONS.md'
  --glob '!.gitignore'
  --glob '!.dockerignore'
)

# Match direct runtime paths, not archive/.../apps/fe-v1 style references.
APP_GHOST_PATTERN='(^|[^/])apps/fe-v1|(^|[^/])apps/ops-web'

fail=0

check_apps() {
  local matches
  matches="$(rg -n "$APP_GHOST_PATTERN" "${RG_EXCLUDES[@]}" "$ROOT" 2>/dev/null || true)"
  if [[ -n "$matches" ]]; then
    echo "ERROR: active legacy app paths (apps/fe-v1, apps/ops-web):"
    echo "$matches"
    fail=1
  fi
}

check_runtime_paths() {
  local matches
  matches="$(rg -l 'cmd/api|funding-worker|price-worker|tool forge|epoch contracts|foundry' \
    apps/ scripts/ deploy/ .github/ \
    docker-compose.yml docker-compose.production.yml docker-compose.markets-dev.yml docker-compose.markets-staging.yml \
    package.json \
    --glob '!archive/**' \
    --glob '!scripts/check-active-legacy-refs.sh' \
    --glob '!scripts/seed-kanban-retropick-v1.sh' \
    2>/dev/null || true)"
  if [[ -n "$matches" ]]; then
    echo "ERROR: active retired runtime/tooling refs in Markets V1 runtime paths:"
    echo "$matches"
    fail=1
  fi
}

check_backend_internals() {
  local matches
  matches="$(rg -l 'internal/indexer|internal/keeper|internal/api' apps/backend/ \
    --glob '!archive/**' 2>/dev/null || true)"
  if [[ -n "$matches" ]]; then
    echo "ERROR: retired internal packages still referenced under apps/backend/:"
    echo "$matches"
    fail=1
  fi
}

check_forbidden_paths() {
  local path
  for path in \
    apps/docs/package.json \
    scripts/market \
    .harness/skills/retropick-market-engine \
    docs/product/market-types.md \
    docs/archive; do
    if [[ -e "$ROOT/$path" ]]; then
      echo "ERROR: forbidden legacy path still present: $path"
      fail=1
    fi
  done
}

check_apps
check_runtime_paths
check_backend_internals
check_forbidden_paths

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "Active legacy ref check: PASS"
