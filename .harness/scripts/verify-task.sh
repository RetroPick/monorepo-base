#!/usr/bin/env bash
# verify-task.sh — verify a task's declared validation commands + evidence presence.
# Usage: verify-task.sh <task-spec-file.md> [worktree-dir]
set -euo pipefail
TASK_SPEC="${1:?usage: verify-task.sh <task-spec-file.md> [worktree-dir]}"
WT="${2:-$(pwd)}"

[[ -f "$TASK_SPEC" ]] || { echo "task spec not found: $TASK_SPEC" >&2; exit 2; }
echo "== task spec: $TASK_SPEC"
grep -q "ACCEPTANCE CRITERIA" "$TASK_SPEC" || echo "WARN: no ACCEPTANCE CRITERIA section"
grep -q "VALIDATION COMMANDS" "$TASK_SPEC" || echo "WARN: no VALIDATION COMMANDS section"
grep -q "HUMAN GATES" "$TASK_SPEC" || echo "WARN: no HUMAN GATES section"
grep -q "HANDOFF REQUIREMENTS" "$TASK_SPEC" || echo "WARN: no HANDOFF REQUIREMENTS section"

# run declared validation commands (safe: only listed commands, from worktree)
while IFS= read -r cmd; do
  [[ -z "$cmd" || "$cmd" == \#* ]] && continue
  echo "-- run: $cmd"
  ( cd "$WT" && eval "$cmd" ) || { echo "FAILED: $cmd" >&2; exit 1; }
done < <(sed -n '/VALIDATION COMMANDS/,/^[A-Z ]*$/p' "$TASK_SPEC" | grep -v "VALIDATION COMMANDS")

# evidence must exist
EVIDENCE=$(grep -oE "evidence/[A-Za-z0-9_./-]+" "$TASK_SPEC" | head -5 || true)
[[ -z "$EVIDENCE" ]] || for e in $EVIDENCE; do
  [[ -f "$WT/$e" ]] || { echo "MISSING EVIDENCE: $e" >&2; exit 1; }
  echo "evidence ok: $e"
done
echo "== verify-task PASS ($TASK_SPEC)"
