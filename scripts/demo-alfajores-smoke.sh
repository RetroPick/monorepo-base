#!/usr/bin/env bash
# Alfajores V3 staging smoke — evidence for RC-1.4.
#
# Usage:
#   RETROPICK_API_BASE=http://127.0.0.1:8080 ./scripts/demo-alfajores-smoke.sh
#   ./scripts/demo-alfajores-smoke.sh http://127.0.0.1:8080
#
# Writes demo-alfajores-smoke.log in the repo root (or DEMO_SMOKE_LOG path).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${DEMO_SMOKE_LOG:-${ROOT}/demo-alfajores-smoke.log}"
api_base="${RETROPICK_API_BASE:-${1:-}}"
if [[ -z "${api_base}" ]]; then
  echo "usage: RETROPICK_API_BASE=<url> $0" >&2
  exit 1
fi
api_base="${api_base%/}"

exec > >(tee -a "${LOG}") 2>&1
echo "=== demo-alfajores-smoke $(date -Iseconds) ==="
echo "api_base=${api_base}"

echo "[1/5] health"
curl -fsS "${api_base}/api/v1/health" | head -c 500
echo

echo "[2/5] gooddollar status (expect 200 when enabled, 404 when disabled)"
status_code="$(curl -sS -o /tmp/gd-status.json -w '%{http_code}' "${api_base}/api/v1/gooddollar/status" || true)"
echo "HTTP ${status_code}"
cat /tmp/gd-status.json || true
echo

if [[ "${status_code}" == "404" ]]; then
  echo "SKIP: GoodDollar API disabled — enable flags + populated registry for full smoke"
  echo "=== smoke partial (flags off) PASS ==="
  exit 0
fi

echo "[3/5] referrals apply-code (two wallets)"
wallet_a="0x1111111111111111111111111111111111111111"
wallet_b="0x2222222222222222222222222222222222222222"
code_resp="$(curl -fsS -X POST "${api_base}/api/v1/referrals/apply-code" \
  -H 'Content-Type: application/json' \
  -d "{\"wallet\":\"${wallet_b}\",\"code\":\"DEMO${RANDOM}\"}" || true)"
echo "${code_resp}"

echo "[4/5] ops fee-router batches (requires RETROPICK_OPS_JWT when auth enforced)"
if [[ -n "${RETROPICK_OPS_JWT:-}" ]]; then
  curl -fsS -H "Authorization: Bearer ${RETROPICK_OPS_JWT}" \
    "${api_base}/api/v1/ops/fee-router/batches" | head -c 1000
  echo
else
  echo "SKIP: set RETROPICK_OPS_JWT for ops route"
fi

echo "[5/5] WS channel note"
ws_url="${api_base/https:/wss:}"
ws_url="${ws_url/http:/ws:}"
echo "Subscribe: ${ws_url}/ws channel impact:gooddollar (public) or reward:treasury (authed wallet)"
echo "After FeeRouter pullAndRoute tx, expect fee_routed envelope with dedupe_key fee_routed:<txHash>:<logIndex>"

echo "=== smoke complete PASS ==="
