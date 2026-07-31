#!/usr/bin/env bash
# CI drift gate: generated Markets OpenAPI types must match schema.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/polymarket"
pnpm generate
if ! git diff --exit-code -- src/generated/api.ts; then
  echo "ERROR: packages/polymarket/src/generated/api.ts is out of date. Run: pnpm --filter @retropick/polymarket generate"
  exit 1
fi
echo "Markets OpenAPI TypeScript drift check: PASS"
