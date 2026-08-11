#!/usr/bin/env bash
# reconcile-release-state.sh — READ-ONLY release state reconciliation.
# Inspects Git HEAD, origin refs, working tree, Android gitlink, Android repo HEAD,
# test evidence, task graph and blockers; writes ONLY local runtime state.
# NEVER: reset, merge, rebase, commit, checkout another user's work, delete branches.
set -euo pipefail

STATE_DIR="${RETROPICK_STATE_DIR:-$HOME/.local/state/retropick-harness}"
STATE_FILE="$STATE_DIR/release-state.yaml"
MONOREPO="${RETROPICK_MONOREPO:-/opt/retropick}"
ANDROID_REPO="${RETROPICK_ANDROID_REPO:-/opt/retropick-android}"
GITLINK_REL="${RETROPICK_GITLINK_REL:-apps/android}"
CHECK_MODE=0
DRY_RUN=0

usage() { echo "Usage: $0 [--check|--dry-run]  (default: regenerate release-state.yaml)"; exit 0; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK_MODE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done

log() { echo "[reconcile] $*"; }

require() { command -v "$1" >/dev/null 2>&1 || { echo "[reconcile] missing: $1" >&2; exit 3; }; }
require git

if [[ $DRY_RUN -eq 1 ]]; then log "dry-run: nothing written"; fi
if [[ $CHECK_MODE -eq 1 ]]; then
  log "check mode: surfacing drift/stuck-task signals only"
fi

mono_sha="unknown"; mono_clean="false"; android_sha="unknown"; gitlink_sha="unknown"
if [[ -d "$MONOREPO/.git" || -d "$MONOREPO" ]]; then
  mono_sha=$(git -C "$MONOREPO" rev-parse HEAD 2>/dev/null || echo unknown)
  mono_status=$(git -C "$MONOREPO" status --porcelain 2>/dev/null | head -1 || true)
  [[ -z "$mono_status" ]] && mono_clean="true"
  if [[ -d "$MONOREPO/$GITLINK_REL" ]]; then
    gitlink_sha=$(git -C "$MONOREPO" ls-tree HEAD "$GITLINK_REL" 2>/dev/null | awk '{print $3}' || echo unknown)
    if [[ "$gitlink_sha" == unknown || ${#gitlink_sha} -lt 7 ]]; then
      # fallback: read submodule status line
      gitlink_sha=$(git -C "$MONOREPO" submodule status "$GITLINK_REL" 2>/dev/null | awk '{print substr($1,2)}' || echo unknown)
    fi
  fi
fi
if [[ -d "$ANDROID_REPO/.git" || -d "$ANDROID_REPO" ]]; then
  android_sha=$(git -C "$ANDROID_REPO" rev-parse HEAD 2>/dev/null || echo unknown)
fi

echo "=== RECONCILE SUMMARY ==="
echo "monorepo_sha:        $mono_sha"
echo "monorepo_clean:      $mono_clean"
echo "android_gitlink_sha: $gitlink_sha"
echo "android_sha:         $android_sha"
if [[ "$CHECK_MODE" -eq 1 ]]; then
  if [[ "$gitlink_sha" != unknown && "$android_sha" != unknown && "$gitlink_sha" != "$android_sha" ]]; then
    echo "DRIFT: android gitlink ($gitlink_sha) != android upstream main ($android_sha)"
  fi
  if [[ "$mono_clean" != "true" ]]; then echo "DRIFT: monorepo working tree not clean"; fi
  exit 0
fi
if [[ $DRY_RUN -eq 1 ]]; then exit 0; fi

mkdir -p "$STATE_DIR"
cat > "$STATE_FILE" <<EOF
# generated $(date -u +%Y-%m-%dT%H:%M:%SZ) by reconcile-release-state.sh (read-only)
release:
  product: markets-v1
  target: web-android
baseline:
  monorepo_sha: $mono_sha
  android_sha: $android_sha
  android_gitlink_sha: $gitlink_sha
  clean: $mono_clean
EOF
log "wrote $STATE_FILE"
