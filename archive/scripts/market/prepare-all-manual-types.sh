#!/usr/bin/env bash
# From monorepo root: prepare (HTTP) upsert + initialize for every built-in manual template (01–09).
# Requires a running API (API_URL). Each JSON uses a distinct slug; run once per chain environment.
# Types 08–09 (Corridor, Cascade) need a real TrustedReporterAdapter in eventOracle; adjust JSON or deploy TRO first.
#
# Usage:
#   export API_URL=http://127.0.0.1:8080
#   ./scripts/market/prepare-all-manual-types.sh
#   OUT_DIR=/tmp/retropick-prepare ./scripts/market/prepare-all-manual-types.sh
#
# Env:
#   OUT_DIR — if set, write full output of each type to $OUT_DIR/0N-prepare.txt
#   PRETTY  — default 0 when OUT_DIR set, else 1
set -euo pipefail

V1_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INNER="$V1_ROOT/scripts/market/launch/launch-by-type.sh"
API_URL="${API_URL:-http://127.0.0.1:8080}"

if [[ -n "${OUT_DIR:-}" ]]; then
  mkdir -p "$OUT_DIR"
  _PRETTY="${PRETTY:-0}"
else
  _PRETTY="${PRETTY:-1}"
fi

for t in 01 02 03 04 05 06 07 08 09; do
  echo "========== type $t ==========" >&2
  if [[ -n "${OUT_DIR:-}" ]]; then
    PRETTY="$_PRETTY" BROADCAST=0 API_URL="$API_URL" "$INNER" "$t" | tee "$OUT_DIR/${t}-prepare.txt"
  else
    PRETTY="$_PRETTY" BROADCAST=0 API_URL="$API_URL" "$INNER" "$t"
  fi
  echo "" >&2
done

echo "done: prepared upsert+initialize for types 01–09 (HTTP only; broadcast separately)" >&2
