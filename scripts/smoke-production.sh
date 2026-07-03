#!/usr/bin/env bash
# Read-only HTTP smoke against a deployed API. Safe for CI: no secrets required on argv.
#
# Usage:
#   RETROPICK_API_BASE=https://api.example.com ./scripts/smoke-production.sh
#   ./scripts/smoke-production.sh https://api.example.com
#
# Optional ops routes (global-state, oracle/health, audit) — JWT from env only (recommended):
#   export RETROPICK_OPS_JWT="…"   # from your secret store; do not commit
#
# Legacy: a second positional JWT is still accepted but prints a deprecation warning
# (shell history risk). Prefer RETROPICK_OPS_JWT.
#
set -euo pipefail

api_base="${RETROPICK_API_BASE:-${1:-}}"
if [[ -z "${api_base}" ]]; then
  echo "usage: RETROPICK_API_BASE=<url> $0" >&2
  echo "   or: $0 <url>" >&2
  exit 1
fi

api_base="${api_base%/}"

ops_jwt="${RETROPICK_OPS_JWT:-}"
if [[ -z "${ops_jwt}" && -n "${2:-}" ]]; then
  echo "warning: pass operator JWT via RETROPICK_OPS_JWT instead of argv (shell history)." >&2
  ops_jwt="${2}"
fi

curl -fsS "${api_base}/api/v1/livez" >/dev/null
curl -fsS "${api_base}/api/v1/health" >/dev/null
curl -fsS "${api_base}/api/v1/readyz" >/dev/null
curl -fsS "${api_base}/api/v1/markets" >/dev/null

contracts_json="$(curl -fsS "${api_base}/api/v1/config/contracts")"
python3 - <<'PY' <<<"${contracts_json}"
import json, sys
data = json.load(sys.stdin)
proxy = (data.get("contracts") or {}).get("marketEngineProxy", "")
zero = "0x0000000000000000000000000000000000000000"
if not proxy or proxy.lower() == zero:
    raise SystemExit("config/contracts: marketEngineProxy missing or zero")
PY

gooddollar_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  "${api_base}/api/v1/gooddollar/status?wallet=0x0000000000000000000000000000000000000001")"
if [[ "${gooddollar_status}" != "404" ]]; then
  echo "expected GET /api/v1/gooddollar/status -> 404 feature_disabled, got ${gooddollar_status}" >&2
  exit 1
fi

ws_url="${api_base/https:/wss:}"
ws_url="${ws_url/http:/ws:}"
printf 'websocket endpoint: %s/ws\n' "${ws_url}"

if [[ -n "${ops_jwt}" ]]; then
  echo "== ops API (operator JWT from env or legacy argv) =="
  hdr=( -H "Authorization: Bearer ${ops_jwt}" )
  curl -fsS "${hdr[@]}" "${api_base}/api/v1/ops/global-state" >/dev/null
  curl -fsS "${hdr[@]}" "${api_base}/api/v1/ops/oracle/health" >/dev/null
  curl -fsS "${hdr[@]}" "${api_base}/api/v1/ops/audit" >/dev/null
  echo "ops probes: ok"
else
  echo "note: export RETROPICK_OPS_JWT to also hit /api/v1/ops/global-state, oracle/health, audit" >&2
fi

echo "smoke checks passed for ${api_base}"
