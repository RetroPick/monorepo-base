#!/usr/bin/env bash
# verify-release.sh — summarize release readiness from release-state + evidence.
# READ-ONLY. Usage: verify-release.sh [--strict]
set -euo pipefail
STATE="${RETROPICK_STATE_DIR:-$HOME/.local/state/retropick-harness}/release-state.yaml"
STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1
[[ -f "$STATE" ]] || { echo "no release-state at $STATE — run reconcile-release-state.sh first" >&2; exit 2; }

echo "== release-state: $STATE"
echo "-- baseline:"; grep -E "monorepo_sha|android_sha|android_gitlink_sha|clean:" "$STATE"
echo "-- gates:"
grep -E "^  [a-z_]+: (null|false|true|green|red)" "$STATE" || true

# gate status from evidence dir
EVID="/opt/retropick/.harness/products/markets-v1/evidence/verification"
if [[ -d "$EVID" ]]; then
  echo "-- evidence phases:"; ls "$EVID" 2>/dev/null | tr '\n' ' '; echo
fi

UNKNOWN=$(grep -cE ": null$" "$STATE" || true)
echo "-- unknown gates: $UNKNOWN"
if [[ $STRICT -eq 1 && $UNKNOWN -gt 0 ]]; then
  echo "STRICT FAIL: $UNKNOWN gates still unknown (no evidence)" >&2
  exit 1
fi
echo "== verify-release done"
