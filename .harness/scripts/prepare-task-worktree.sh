#!/usr/bin/env bash
# prepare-task-worktree.sh — create an isolated worktree for one implementation task.
# Validates task id + repo selector; ensures canonical repo is clean; fetches safely;
# creates branch agent/<task-id>-<agent-slug>; refuses duplicate/conflicting worktrees.
# NEVER force-resets another branch; NEVER touches canonical checkouts directly.
set -euo pipefail

usage() { echo "Usage: $0 <task-id> <monorepo|android> [agent-slug]"; exit 0; }
[[ $# -lt 2 ]] && usage
TASK_ID="$1"; REPO_SEL="$2"; AGENT_SLUG="${3:-worker}"

case "$REPO_SEL" in
  monorepo) SRC=/opt/retropick; BASE=/opt/worktrees/retropick ;;
  android)  SRC=/opt/retropick-android; BASE=/opt/worktrees/retropick-android ;;
  *) echo "repo selector must be 'monorepo' or 'android'" >&2; exit 2 ;;
esac

[[ "$TASK_ID" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "invalid task id: $TASK_ID" >&2; exit 2; }
[[ -d "$SRC/.git" ]] || { echo "canonical repo missing: $SRC" >&2; exit 2; }

BRANCH="agent/$TASK_ID-$AGENT_SLUG"
WT_DIR="$BASE/$TASK_ID"
if [[ -d "$WT_DIR" ]]; then echo "conflict: worktree exists: $WT_DIR" >&2; exit 4; fi
if git -C "$SRC" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "conflict: branch exists: $BRANCH" >&2; exit 4
fi

# canonical repo must be clean (uncommitted work safety)
if ! git -C "$SRC" diff --quiet; then echo "canonical repo dirty — stop: $SRC" >&2; exit 5; fi

mkdir -p "$BASE"
git -C "$SRC" fetch origin --quiet || { echo "fetch failed (network?)" >&2; exit 6; }
git -C "$SRC" worktree add -b "$BRANCH" "$WT_DIR" "origin/main" >&2
echo "WORKTREE=$WT_DIR"
echo "BRANCH=$BRANCH"
echo "BASELINE=$(git -C "$WT_DIR" rev-parse HEAD)"
