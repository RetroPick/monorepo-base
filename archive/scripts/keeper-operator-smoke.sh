#!/usr/bin/env bash
# Non-interactive keeper / API sanity checks. Safe for CI: no secrets on argv.
#
# Usage:
#   RETROPICK_API_BASE=https://api.example.com ./scripts/keeper-operator-smoke.sh
#   ./scripts/keeper-operator-smoke.sh https://api.example.com
#
# Optional (enables /api/v1/ops/* probes — operator JWT from env only, never argv):
#   export RETROPICK_OPS_JWT="…"   # from your secret store; do not commit
#
set -euo pipefail

base="${RETROPICK_API_BASE:-${1:-}}"
if [[ -z "${base}" ]]; then
  echo "usage: RETROPICK_API_BASE=<url> $0" >&2
  echo "   or: $0 <url>" >&2
  exit 1
fi

# Strip trailing slash
base="${base%/}"

echo "== public API (no auth) =="
curl -fsS "${base}/api/v1/livez" >/dev/null
curl -fsS "${base}/api/v1/readyz" >/dev/null
curl -fsS "${base}/api/v1/health" >/dev/null
curl -fsS "${base}/api/v1/markets" >/dev/null
echo "public probes: ok"

if [[ -n "${RETROPICK_OPS_JWT:-}" ]]; then
  echo "== ops API (operator JWT from RETROPICK_OPS_JWT) =="
  hdr=( -H "Authorization: Bearer ${RETROPICK_OPS_JWT}" )
  curl -fsS "${hdr[@]}" "${base}/api/v1/ops/global-state" >/dev/null
  curl -fsS "${hdr[@]}" "${base}/api/v1/ops/keeper/schedule?limit=50" >/dev/null
  curl -fsS "${hdr[@]}" "${base}/api/v1/ops/keeper/executions?limit=50" >/dev/null
  echo "ops keeper probes: ok"
else
  echo "note: export RETROPICK_OPS_JWT to also hit /api/v1/ops/keeper/* (see .dev/backend/keeper.md)" >&2
fi

echo "keeper-operator-smoke: all checks passed (${base})"
