# RUNBOOK — Release factory operations

## Daily / continuous (24/7)

- Gateway runs one instance (Hermes gateway, Telegram). Kanban dispatcher is in-gateway.
- `reconcile-release-state.sh --check` runs on a timer/cron (read-only): detects drift, stuck tasks, refreshes release-state, surfaces blockers. Never pulls/merges/resets/deploys.

## Bootstrap / recovery (current stage)

1. Baseline reconciliation (R0-001..R0-005, read-only) — approve before product work.
2. User's unpushed local work must be pushed and baseline frozen (monorepo SHA + Android SHA) before any product implementation.

## Normal task lifecycle

1. Orchestrator picks a ready task from `task-graph.yaml` / Kanban.
2. `prepare-task-worktree.sh <task-id> <repo>` → isolated branch + worktree.
3. Worker implements under owned paths only; runs validation commands; fills verification + handoff templates.
4. QA (`rp-qa-e2e`) → review (`rp-review-security`, read-only, APPROVE/REJECT).
5. Remediation task if REJECT (reviewer never repairs its own rejection).
6. PR (no auto-merge during bootstrap). Human release gate for production.

## Escalation

- Max retries: 1. After a failed retry → BLOCK and escalate (no infinite loops).
- Human gates: see `HUMAN_GATES.yaml` — BLOCK, report needed/why/human-action/resumes.

## Verification evidence

- Evidence lives in `evidence/verification/<PHASE>/<task>-evidence.md`.
- A gate is green only with evidence; never from a README assertion.

## Tooling

- `.harness/scripts/reconcile-release-state.sh` — read-only state reconcile (`--check`/`--dry-run`).
- `.harness/scripts/prepare-task-worktree.sh` — safe worktree creation.
- `.harness/scripts/sync-android-gitlink.sh` — explicit-SHA Android gitlink sync.
- `.harness/scripts/validate-harness.sh` — harness integrity gate (fail non-zero on violation).
- `.harness/scripts/bootstrap-hermes-fleet.sh` — idempotent profile/board bootstrap (informational; Hermes CLI is authoritative).
- `.harness/scripts/verify-task.sh` / `verify-release.sh` — task/release verification helpers.
