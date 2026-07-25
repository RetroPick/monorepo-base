#!/usr/bin/env bash
# Compare upgrade-sensitive contract storage layouts against committed baselines.
#
# Usage:
#   ./script/check-storage-layout.sh              # verify
#   UPDATE_STORAGE_LAYOUT=1 ./script/check-storage-layout.sh  # refresh baselines
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE_DIR="$ROOT/.storage-layout"
UPDATE="${UPDATE_STORAGE_LAYOUT:-0}"

CONTRACTS=(
  "src/engine/MarketEngineDispatcher.sol:MarketEngineDispatcher"
  "src/engine/modules/MarketEngineAdminModule.sol:MarketEngineAdminModule"
  "src/engine/modules/MarketEngineViewModule.sol:MarketEngineViewModule"
  "src/treasury/FeeRouter.sol:FeeRouter"
)

forge build --root "$ROOT" -q

mkdir -p "$BASELINE_DIR"

normalize_layout() {
  python3 - "$1" <<'PY'
import json, sys

path = sys.argv[1]
with open(path) as f:
    data = json.load(f)

rows = []
for slot in data.get("storage", []):
    rows.append(
        {
            "slot": slot.get("slot"),
            "label": slot.get("label"),
            "type": slot.get("type"),
            "offset": slot.get("offset"),
            "slot_index": slot.get("slot_index"),
        }
    )
rows.sort(key=lambda r: (r["slot"], r["label"] or ""))
json.dump({"storage": rows}, sys.stdout, indent=2, sort_keys=True)
PY
}

failed=0
for spec in "${CONTRACTS[@]}"; do
  name="${spec##*:}"
  baseline="$BASELINE_DIR/${name}.json"
  current="$(mktemp)"
  trap 'rm -f "$current"' RETURN

  forge inspect "$spec" storage-layout --json --root "$ROOT" >"$current"
  normalize_layout "$current" >"${current}.norm"

  if [[ "$UPDATE" == "1" ]]; then
    cp "${current}.norm" "$baseline"
    echo "updated baseline: $baseline"
    continue
  fi

  if [[ ! -f "$baseline" ]]; then
    echo "missing baseline: $baseline (run UPDATE_STORAGE_LAYOUT=1 $0)" >&2
    failed=1
    continue
  fi

  if ! diff -u "$baseline" "${current}.norm" >/dev/null; then
    echo "storage layout drift: $name" >&2
    diff -u "$baseline" "${current}.norm" >&2 || true
    failed=1
  else
    echo "ok: $name"
  fi
done

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "storage-layout check passed (${#CONTRACTS[@]} contracts)"
