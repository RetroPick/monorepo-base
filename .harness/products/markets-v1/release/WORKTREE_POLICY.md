# WORKTREE_POLICY — Isolated execution model

Canonical checkouts are NOT worker scratchpads.

- Monorepo canonical checkout: `/opt/retropick` (branch `main`)
- Android canonical checkout: `/opt/retropick-android`
- Worker worktrees:
  - `/opt/worktrees/retropick/<task-id>/`
  - `/opt/worktrees/retropick-android/<task-id>/`

## Rules

1. Each implementation task gets **exactly one branch and one worktree**.
2. Branch naming: `agent/<task-id>-<agent-slug>`.
3. Never run two implementation agents in the same worktree.
4. Never edit canonical checkouts directly (no `cd /opt/retropick && code`).
5. Never force-reset another branch; never rewrite shared history.
6. Harness-only branches (e.g. `harness/*`) are not implementation worktrees.
7. Worktree lifecycle: `prepare-task-worktree.sh <task-id> <repo>` creates;
   task completion/merge cleanup removes it. No stray worktrees accumulate.

## Isolation guarantee

Worktrees prevent parallel agents from clobbering each other's checkout and
keep canonical `main` clean until a reviewed PR is merged.
