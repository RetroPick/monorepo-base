# WORKTREE_POLICY — Isolated execution model

Canonical checkouts are NOT worker scratchpads.

- Monorepo canonical checkout: `/opt/retropick` (branch `main`)
- Android canonical checkout: `/opt/retropick-android`

Worker worktrees — two valid conventions:

| Convention | Location | Used by |
|------------|----------|---------|
| Hermes kanban worktree (dispatcher default) | `<repo>/.worktrees/<task-id>/` | Kanban-spawned tasks (workspace_kind=worktree, e.g. `/opt/retropick/.worktrees/t_4baf7230/`) |
| prepare-task-worktree.sh | `/opt/worktrees/retropick/<task-id>/` and `/opt/worktrees/retropick-android/<task-id>/` | `.harness/scripts/prepare-task-worktree.sh` for script-driven task prep |

`.worktrees/` is git-ignored at the repo root so repo-local linked worktrees never show as untracked in `main` (release-state clean:true).

## Rules

1. Each implementation task gets **exactly one branch and one worktree**.
2. Branch naming: `agent/<task-id>-<agent-slug>` (Hermes kanban: deterministic `<project-slug>/<task-id>` for project-linked tasks).
3. Never run two implementation agents in the same worktree.
4. Never edit canonical checkouts directly (no `cd /opt/retropick && code`).
5. Never force-reset another branch; never rewrite shared history.
6. Harness-only branches (e.g. `harness/*`) are not implementation worktrees.
7. Worktree lifecycle: `prepare-task-worktree.sh <task-id> <repo>` creates;
   task completion/merge cleanup removes it. Hermes kanban worktrees live under
   `<repo>/.worktrees/<task-id>/` and are cleaned up by the dispatcher/operator.
   No stray worktrees accumulate.

## Isolation guarantee

Worktrees prevent parallel agents from clobbering each other's checkout and
keep canonical `main` clean until a reviewed PR is merged.
