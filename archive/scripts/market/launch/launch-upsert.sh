#!/usr/bin/env bash
# Compatibility entry point for prepare + optional broadcast of one upsert fixture.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../../.." && pwd)"
upsert_file="${1:?usage: launch-upsert.sh <upsert.json>}"
prepared="$(mktemp -t retropick-upsert-XXXXXX.json)"
trap 'rm -f "$prepared"' EXIT
"$V1_ROOT/scripts/market/prepare-upsert-template.sh" "$upsert_file" >"$prepared"
if [[ "${BROADCAST:-0}" == "1" ]]; then
  "$V1_ROOT/scripts/market/broadcast-prepared-ops-tx.sh" "$prepared"
else
  cat "$prepared"
fi
