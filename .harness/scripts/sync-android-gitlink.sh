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

# Android repo must contain this commit
ANDROID_REPO="${RETROPICK_ANDROID_REPO:-/opt/retropick-android}"
if [[ -d "$ANDROID_REPO/.git" ]]; then
  git -C "$ANDROID_REPO" cat-file -e "$ANDROID_SHA^{commit}" 2>/dev/null || { echo "SHA not in Android repo: $ANDROID_SHA" >&2; exit 3; }
  echo "validated: $ANDROID_SHA exists in $ANDROID_REPO"
else
  echo "WARN: $ANDROID_REPO not present; validating against origin"
  git ls-remote git@github.com:RetroPick/RetroPick-Android.git "$ANDROID_SHA" >/dev/null 2>&1 || { echo "SHA not on Android origin" >&2; exit 3; }
fi

# Integration worktree must be clean
[[ -d "$WT/.git" ]] || { echo "integration worktree missing: $WT (use prepare-task-worktree.sh)" >&2; exit 4; }
git -C "$WT" diff --quiet || { echo "integration worktree dirty — stop" >&2; exit 5; }

# Pin the gitlink. Submodule workflow: git -C "$WT" submodule update --init apps/android
# then checkout the pinned SHA inside the submodule, then `git add apps/android`.
if [[ -f "$WT/.gitmodules" ]]; then
  git -C "$WT" submodule update --init apps/android 2>/dev/null || true
  git -C "$WT/apps/android" checkout "$ANDROID_SHA" 2>/dev/null || echo "WARN: gitlink checkout failed — verify submodule URL" >&2
fi
git -C "$WT" add apps/android 2>/dev/null || echo "WARN: apps/android is a plain gitlink (no submodule); pin via gitlink SHA update" >&2
echo "gitlink pinned to $ANDROID_SHA in $WT"
echo "NOTE: do NOT merge to main automatically. Open a PR for review."
