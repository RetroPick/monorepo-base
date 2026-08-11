# HARNESS.md — RetroPick Release Factory

The repository harness is the **agent execution / release factory** for RetroPick Markets V1. It runs on this VPS via **Hermes Agent** (Telegram gateway + Kanban dispatcher), with implementation isolated in Git worktrees.

## Canonical locations

| Concern | Location |
|---|---|
| Execution policy & evidence | `.harness/products/markets-v1/**` (governance, planning, templates, evidence, release) |
| Active agent roster | `.harness/agents/*.agent.md` (rp-*) |
| Project context / manifest / RAG | `.harness/project-context.md`, `.harness/project.manifest.json`, `.harness/rag.config.json` |
| Harness scripts | `.harness/scripts/` |
| Product/spec docs | `.dev/markets-v1/**` (specification — not execution state) |
| Live task state | `~/.hermes/kanban.db` (board `retropick-markets-release`) |
| Runtime release state | `~/.local/state/retropick-harness/release-state.yaml` |

## Kanban

- **Board:** `retropick-markets-release` (Hermes Kanban, in-gateway dispatcher)
- Concurrency: max 2 in progress, max 1 per profile; one heavy worker at a time
- Orchestrator profile: `rp-release-orchestrator`
- No automatic merge to main during bootstrap; no autonomous product implementation before the R0 canonical baseline is approved

## Worktree policy

Canonical checkouts (`/opt/retropick`, `/opt/retropick-android`) are NOT worker scratchpads. Each implementation task gets one isolated worktree under `/opt/worktrees/retropick/<task-id>/` (branch `agent/<task-id>-<slug>`). See `.harness/products/markets-v1/release/WORKTREE_POLICY.md` and `scripts/prepare-task-worktree.sh`.

## RAG

RAG sources are configured in `.harness/rag.config.json` (Markets-first). Generated RAG databases are runtime state — never committed (see `.harness/state/README.md`).

## Scripts

- `reconcile-release-state.sh [--check|--dry-run]` — read-only release-state reconciliation (safe for cron)
- `prepare-task-worktree.sh <task-id> <monorepo|android> [slug]` — isolated worktree creation
- `sync-android-gitlink.sh <sha>` — explicit-SHA Android gitlink update (never auto-follows upstream)
- `validate-harness.sh` — harness integrity gate
- `verify-task.sh` / `verify-release.sh` — task / release verification helpers

## Legacy note

The pre-v2 embedded harness (`cli/harness`, `AGENT_HARNESS_HOME`, board `retropick-v1`, `scripts/seed-kanban-retropick-v1.sh`, legacy `sc-*`/`be-*`/`fe-*` agents) is superseded by this release factory. Legacy material is preserved (agents as REFERENCE/DISABLED; seed script remains for historical reference) but is not the active release organization.
