#!/usr/bin/env bash
# Smoke test Markets V1 Docker dev stack (expects stack already running).
set -euo pipefail

MARKETS_BFF_URL="${MARKETS_BFF_URL:-http://127.0.0.1:8080}"
FAIL=0

check_json() {
  local url="$1"
  local label="$2"
  if ! curl -fsS "$url" | head -c 1 | grep -q '{'; then
    printf 'FAIL  %s — not JSON (%s)\n' "$label" "$url" >&2
    FAIL=1
    return
  fi
  printf 'ok    %s\n' "$label"
}

check_http() {
  local url="$1"
  local label="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url")"
  if [[ "$code" != "200" && "$code" != "503" ]]; then
    printf 'FAIL  %s — HTTP %s (%s)\n' "$label" "$code" "$url" >&2
    FAIL=1
    return
  fi
  printf 'ok    %s (HTTP %s)\n' "$label" "$code"
}

check_json "${MARKETS_BFF_URL}/api/v1/health/live" "health live"
check_http "${MARKETS_BFF_URL}/api/v1/health/ready" "health ready"
check_json "${MARKETS_BFF_URL}/api/v1/markets/capabilities" "capabilities"
check_json "${MARKETS_BFF_URL}/api/v1/markets/events" "events list"

events_body="$(curl -fsS "${MARKETS_BFF_URL}/api/v1/markets/events")"
if ! printf '%s' "$events_body" | grep -q 'polymarket:event:seed-multi'; then
  printf 'FAIL  seeded event polymarket:event:seed-multi not in events list\n' >&2
  FAIL=1
else
  printf 'ok    seeded event polymarket:event:seed-multi\n'
fi

if ! printf '%s' "$events_body" | grep -q 'schemaVersion'; then
  printf 'FAIL  events response missing schemaVersion\n' >&2
  FAIL=1
else
  printf 'ok    events schemaVersion present\n'
fi

if (( FAIL )); then
  exit 1
fi

printf 'Markets stack smoke passed.\n'
