#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CATALOG_PATH="${CATALOG_PATH:-$ROOT_DIR/apps/backend/internal/launchboard/base_sepolia_9_markets.json}"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/.retropick-launch/base-sepolia-9-markets}"
LAUNCH_AT="${LAUNCH_AT:-$(date -u +%s)}"
SEND="${SEND:-0}"

need_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: missing required binary: $1" >&2
    exit 1
  }
}

need_bin python3
need_bin go
need_bin cast

export GOCACHE="${GOCACHE:-/tmp/retropick-go-cache}"

mkdir -p "$OUT_DIR/args" "$OUT_DIR/prepared"
shopt -s nullglob
rm -f \
  "$OUT_DIR"/args/*.json \
  "$OUT_DIR"/prepared/*.json \
  "$OUT_DIR"/catalog-summary.json \
  "$OUT_DIR"/feed-steps.json \
  "$OUT_DIR"/markets.json \
  "$OUT_DIR"/request.json \
  "$OUT_DIR"/summary.json
shopt -u nullglob

ROLLING_START_AT="$(python3 - "$LAUNCH_AT" <<'PY'
import sys
launch_at = int(sys.argv[1])
interval = 12 * 60 * 60
print(((launch_at + interval - 1) // interval) * interval)
PY
)"

CHAIN_ID="$(python3 - "$CATALOG_PATH" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["chainId"])
PY
)"

prepare_call() {
  local fn="${1:?}" args_file="${2:?}" out_file="${3:?}"
  (cd "$ROOT_DIR/apps/backend" && go run ./cmd/prepare-launchboard-calldata \
    --function "$fn" \
    --args-file "$args_file" \
    --catalog "$CATALOG_PATH") >"$out_file"
}

template_id_for_slug() {
  cast keccak "$1"
}

python3 - "$CATALOG_PATH" "$OUT_DIR/catalog-summary.json" <<'PY'
import json, sys
src = json.load(open(sys.argv[1], encoding="utf-8"))
json.dump(
    {
        "boardId": src["boardId"],
        "chainId": src["chainId"],
        "marketCount": len(src["markets"]),
    },
    open(sys.argv[2], "w", encoding="utf-8"),
    indent=2,
)
PY

python3 - "$CATALOG_PATH" "$OUT_DIR/feed-steps.json" <<'PY'
import json, sys
src = json.load(open(sys.argv[1], encoding="utf-8"))
seen = set()
steps = []
for market in src["markets"]:
    feed = market["feed"]
    key = (feed["address"].lower(), int(feed["decimals"]))
    if key in seen:
        continue
    seen.add(key)
    steps.append({"feedId": feed["address"], "decimals": int(feed["decimals"])})
json.dump(steps, open(sys.argv[2], "w", encoding="utf-8"), indent=2)
PY

feed_count="$(python3 - "$OUT_DIR/feed-steps.json" <<'PY'
import json, sys
print(len(json.load(open(sys.argv[1], encoding="utf-8"))))
PY
)"

for ((i = 0; i < feed_count; i++)); do
  args_file="$OUT_DIR/args/$(printf '%02d' "$((i + 1))")-set-feed-decimals.json"
  out_file="$OUT_DIR/prepared/$(printf '%02d' "$((i + 1))")-set-feed-decimals.json"
  python3 - "$OUT_DIR/feed-steps.json" "$i" >"$args_file" <<'PY'
import json, sys
steps = json.load(open(sys.argv[1], encoding="utf-8"))
step = steps[int(sys.argv[2])]
json.dump([step["feedId"], step["decimals"]], sys.stdout)
PY
  prepare_call "setFeedDecimals" "$args_file" "$out_file"
done

python3 - "$CATALOG_PATH" "$OUT_DIR/markets.json" <<'PY'
import json, sys
src = json.load(open(sys.argv[1], encoding="utf-8"))
json.dump(src["markets"], open(sys.argv[2], "w", encoding="utf-8"), indent=2)
PY

market_count="$(python3 - "$OUT_DIR/markets.json" <<'PY'
import json, sys
print(len(json.load(open(sys.argv[1], encoding="utf-8"))))
PY
)"

seq=$((feed_count + 1))
for ((i = 0; i < market_count; i++)); do
  market_json="$(python3 - "$OUT_DIR/markets.json" "$i" <<'PY'
import json, sys
markets = json.load(open(sys.argv[1], encoding="utf-8"))
print(json.dumps(markets[int(sys.argv[2])], separators=(",", ":")))
PY
)"
  slug="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["slug"])' "$market_json")"
  launch_mode="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["launchMode"])' "$market_json")"
  template_id="$(template_id_for_slug "$slug")"

  upsert_args="$OUT_DIR/args/$(printf '%02d' "$seq")-${slug}-upsert.json"
  upsert_prepared="$OUT_DIR/prepared/$(printf '%02d' "$seq")-${slug}-upsert.json"
  python3 -c 'import json,sys; print(json.dumps([json.loads(sys.argv[1])["upsertTemplate"]]))' "$market_json" >"$upsert_args"
  prepare_call "upsertTemplate" "$upsert_args" "$upsert_prepared"
  seq=$((seq + 1))

  init_args="$OUT_DIR/args/$(printf '%02d' "$seq")-${slug}-initialize.json"
  init_prepared="$OUT_DIR/prepared/$(printf '%02d' "$seq")-${slug}-initialize.json"
  python3 -c 'import json,sys; print(json.dumps([sys.argv[1]]))' "$template_id" >"$init_args"
  prepare_call "initializeMarket" "$init_args" "$init_prepared"
  seq=$((seq + 1))

  if [[ "$launch_mode" == "manual" ]]; then
    open_args="$OUT_DIR/args/$(printf '%02d' "$seq")-${slug}-open.json"
    open_prepared="$OUT_DIR/prepared/$(printf '%02d' "$seq")-${slug}-open.json"
    python3 - "$CATALOG_PATH" "$template_id" "$LAUNCH_AT" >"$open_args" <<'PY'
import json, sys
catalog = json.load(open(sys.argv[1], encoding="utf-8"))
template_id = sys.argv[2]
launch_at = int(sys.argv[3])
offsets = catalog["manualEpochOffsetsSeconds"]
args = [
    template_id,
    1,
    launch_at + int(offsets["openAt"]),
    launch_at + int(offsets["lockAt"]),
    launch_at + int(offsets["resolveAt"]),
]
json.dump(args, sys.stdout)
PY
    prepare_call "openEpoch" "$open_args" "$open_prepared"
    seq=$((seq + 1))
  else
    genesis_args="$OUT_DIR/args/$(printf '%02d' "$seq")-${slug}-genesis.json"
    genesis_prepared="$OUT_DIR/prepared/$(printf '%02d' "$seq")-${slug}-genesis.json"
    python3 -c 'import json,sys; print(json.dumps([sys.argv[1]]))' "$template_id" >"$genesis_args"
    prepare_call "genesisStartRolling" "$genesis_args" "$genesis_prepared"
    seq=$((seq + 1))
  fi
done

python3 - "$OUT_DIR/prepared" "$LAUNCH_AT" "$ROLLING_START_AT" <<'PY'
import json, os, sys
prepared_dir = sys.argv[1]
summary = {
    "launchAt": int(sys.argv[2]),
    "rollingStartAt": int(sys.argv[3]),
    "preparedFiles": sorted(os.listdir(prepared_dir)),
}
json.dump(summary, open(os.path.join(prepared_dir, "..", "summary.json"), "w", encoding="utf-8"), indent=2)
PY

if [[ "$SEND" == "1" ]]; then
  : "${RPC_URL:?set RPC_URL when SEND=1}"
  : "${CAST_ACCOUNT:?set CAST_ACCOUNT when SEND=1}"
  : "${ETH_PASSWORD:?set ETH_PASSWORD when SEND=1}"
  sender_addr="$(cast wallet address --account "$CAST_ACCOUNT" --password-file "$ETH_PASSWORD")"
  next_nonce="$(cast nonce --block pending --rpc-url "$RPC_URL" "$sender_addr")"
  shopt -s nullglob
  for prepared in "$OUT_DIR"/prepared/*.json; do
    target="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["target"])' "$prepared")"
    calldata="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["calldata"])' "$prepared")"
    cast send "$target" "$calldata" --rpc-url "$RPC_URL" --account "$CAST_ACCOUNT" --password-file "$ETH_PASSWORD" --nonce "$next_nonce"
    next_nonce=$((next_nonce + 1))
  done
  shopt -u nullglob
fi

echo "prepared board launch in $OUT_DIR"
echo "manual launchAt=${LAUNCH_AT}"
echo "rolling startAt=${ROLLING_START_AT}"
