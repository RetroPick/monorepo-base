#!/usr/bin/env bash
# Prepare upsertTemplate calldata through the local API. No signing occurs here.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../.." && pwd)"
upsert_file="${1:?usage: prepare-upsert-template.sh <upsert.json>}"
args_file="$(mktemp)"
trap 'rm -f "$args_file"' EXIT
python3 - "$upsert_file" >"$args_file" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    params = json.load(f)
json.dump([params], sys.stdout)
PY
exec "$V1_ROOT/scripts/market/prepare-ops-tx.sh" upsertTemplate "$args_file"
