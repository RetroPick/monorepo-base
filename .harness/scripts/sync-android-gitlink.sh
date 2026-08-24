#!/usr/bin/env bash
# sync-android-gitlink.sh — update monorepo apps/android gitlink to an EXPLICIT
# Android commit SHA, only with validated evidence. NEVER auto-follows upstream main.
# NEVER merges to main automatically.
set -euo pipefail

usage() { echo "Usage: $0 <android-commit-sha> [worktree-dir]"; exit 0; }
[[ $# -lt 1 ]] && usage
ANDROID_SHA="$1"
WT="${2:-/opt/worktrees/retropick/android-gitlink-integration}"

[[ "$ANDROID_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "invalid SHA: $ANDROID_SHA (full 40-char sha required)" >&2; exit 2; }

# Android repo must contain this commit. A linked worktree has a .git file, so
# repository identity is established through Git rather than filesystem shape.
ANDROID_REPO="${RETROPICK_ANDROID_REPO:-/opt/retropick-android}"
if [[ "$(git -C "$ANDROID_REPO" rev-parse --is-inside-work-tree 2>/dev/null || true)" == "true" ]]; then
  git -C "$ANDROID_REPO" cat-file -e "$ANDROID_SHA^{commit}" 2>/dev/null || { echo "SHA not in Android repo: $ANDROID_SHA" >&2; exit 3; }
  echo "validated: $ANDROID_SHA exists in $ANDROID_REPO"
else
  echo "WARN: $ANDROID_REPO not present; validating against origin"
  REMOTE_MATCH=$(git ls-remote git@github.com:RetroPick/RetroPick-Android.git "$ANDROID_SHA" 2>/dev/null || true)
  [[ "$REMOTE_MATCH" == "$ANDROID_SHA"$'\t'* ]] || { echo "SHA not on Android origin" >&2; exit 3; }
fi

# Integration worktree must be clean
[[ "$(git -C "$WT" rev-parse --is-inside-work-tree 2>/dev/null || true)" == "true" ]] || { echo "integration worktree missing: $WT (use prepare-task-worktree.sh)" >&2; exit 4; }
[[ -z "$(git -C "$WT" status --porcelain)" ]] || { echo "integration worktree dirty — stop" >&2; exit 5; }

# Require an existing gitlink and pin it directly in the superproject index.
# Never initialize, checkout, or otherwise mutate the child repository.
CURRENT_ENTRY=$(git -C "$WT" ls-files -s -- apps/android)
[[ "${CURRENT_ENTRY%% *}" == "160000" ]] || { echo "apps/android must be a mode 160000 gitlink" >&2; exit 6; }
git -C "$WT" update-index --cacheinfo "160000,$ANDROID_SHA,apps/android"
EXPECTED_ENTRY=$(printf '160000 %s 0\tapps/android' "$ANDROID_SHA")
ACTUAL_ENTRY=$(git -C "$WT" ls-files -s -- apps/android)
[[ "$ACTUAL_ENTRY" == "$EXPECTED_ENTRY" ]] || { echo "gitlink postcondition failed: expected $EXPECTED_ENTRY, got $ACTUAL_ENTRY" >&2; exit 7; }
echo "gitlink pinned to $ANDROID_SHA in $WT"
echo "NOTE: do NOT merge to main automatically. Open a PR for review."
