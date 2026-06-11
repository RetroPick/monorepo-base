#!/usr/bin/env bash
# Broadcast exported calldata with a local cast keystore. Secrets stay outside argv.
set -euo pipefail
_WRAP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
V1_ROOT="$(cd "$_WRAP/../.." && pwd)"
# shellcheck disable=SC1091
source "$V1_ROOT/scripts/lib/load-env.sh"
load_repo_env "$V1_ROOT/.env"
load_repo_env "$V1_ROOT/package/prediction-v2/.env"

prepared="${1:?usage: broadcast-prepared-ops-tx.sh <prepared.json>}"
target="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["target"])' "$prepared")"
calldata="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["calldata"])' "$prepared")"
rpc_url="${RPC_URL:-https://sepolia.base.org}"
account="${CAST_ACCOUNT:-${ETH_KEYSTORE_ACCOUNT:-${DEPLOY_ACCOUNT:-testnet}}}"

cmd=(cast send "$target" --data "$calldata" --rpc-url "$rpc_url" --account "$account")
if [[ -n "${ETH_PASSWORD:-}" ]]; then
  cmd+=(--password-file "$ETH_PASSWORD")
fi
if [[ "${DRY_RUN:-0}" == "1" || "${RETRODEPLOYER_DRY_RUN:-0}" == "1" ]]; then
  printf 'dry-run: cast send %s --data %s --rpc-url %s --account %s\n' "$target" "$calldata" "$rpc_url" "$account"
  exit 0
fi
exec "${cmd[@]}"
