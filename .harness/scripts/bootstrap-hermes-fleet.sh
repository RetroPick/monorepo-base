#!/usr/bin/env bash
# bootstrap-hermes-fleet.sh — IDEMPOTENT Hermes fleet bootstrap (informational).
# The installed `hermes` CLI is authoritative; this script only documents and
# drives the supported CLI surface. It never hand-edits config.yaml.
# Re-running is safe: existing profiles/board are reused.
set -euo pipefail

H=hermes
BOARD=retropick-markets-release
PROFILES=(rp-release-orchestrator rp-recovery-architect rp-api-contract rp-backend-markets \
          rp-web rp-android rp-qa-e2e rp-sre-release rp-review-security)

command -v "$H" >/dev/null || { echo "hermes CLI not found" >&2; exit 2; }
echo "hermes version: $($H --version | head -1)"

# 1. Profiles (clone from default to reuse the configured DeepSeek provider)
for p in "${PROFILES[@]}"; do
  if $H profile list 2>/dev/null | grep -qw "$p"; then
    echo "profile exists: $p"
  else
    echo "creating profile: $p"
    $H profile create --clone "$p"
  fi
done

# 2. Board
if $H kanban boards 2>/dev/null | grep -qw "$BOARD"; then
  echo "board exists: $BOARD"
else
  echo "creating board: $BOARD"
  $H kanban boards create "$BOARD" --name "RetroPick Markets Release" || true
fi

echo "NOTE: descriptions for each rp-* profile are set via: hermes profile describe <name>"
echo "NOTE: orchestrator tool restriction (kanban/planning/messaging only) must be applied"
echo "      with supported config keys — verify: hermes config get <key>"
echo "NOTE: board concurrency (max 2, per-profile 1) and auto_decompose off are set via"
echo "      hermes config set kanban.* — verify keys with 'hermes config show'."
