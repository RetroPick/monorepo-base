#!/usr/bin/env bash
# Prepare whitelisted operator calldata through the local API. No signing occurs here.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../.." && pwd)"
# shellcheck disable=SC1091
source "$V1_ROOT/scripts/lib/load-env.sh"
load_repo_env "$V1_ROOT/.env"
load_repo_env "$V1_ROOT/archive/contracts/legacy-pool-v1/.env"

fn="${1:?usage: prepare-ops-tx.sh <function> <args.json>}"
args_file="${2:?usage: prepare-ops-tx.sh <function> <args.json>}"
api_url="${API_URL:-http://127.0.0.1:8080}"
payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT
python3 - "$fn" "$args_file" >"$payload" <<'PY'
import json, sys
fn, path = sys.argv[1:]
with open(path, encoding="utf-8") as f:
    args = json.load(f)
if not isinstance(args, list):
    raise SystemExit("args file must contain a JSON array")
json.dump({"function": fn, "args": args}, sys.stdout)
PY

headers=(-H "Content-Type: application/json")
if [[ -n "${RETROPICK_OPS_JWT:-}" ]]; then
  headers+=(-H "Authorization: Bearer ${RETROPICK_OPS_JWT}")
fi
curl -fsS --max-time "${RETRODEPLOYER_PREPARE_TIMEOUT:-10}" \
  "${headers[@]}" --data-binary "@$payload" \
  "${api_url%/}/api/v1/ops/tx/prepare" |
  if [[ "${PRETTY:-1}" == "1" ]]; then python3 -m json.tool; else cat; fi
