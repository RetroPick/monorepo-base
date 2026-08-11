# .harness — RetroPick Release Factory

This directory is the **agent execution / release factory** for RetroPick. It holds execution policy, agent roster, task specs, evidence, orchestration, and release infrastructure policy.

## Source-of-truth hierarchy

| Level | Truth | Location |
|---|---|---|
| 1 | Runtime truth: Git tree + tests + CI + staging behavior | repo (`apps/`, `schemas/`, CI) |
| 2 | Live execution state | `~/.hermes/kanban.db` + `~/.local/state/retropick-harness/release-state.yaml` |
| 3 | Execution policy | `.harness/products/markets-v1/**` |
| 4 | Product / architecture specification | `.dev/markets-v1/**` |
| 5 | Historical / legacy material | `archive/**`, legacy docs |

Never claim a feature is complete because documentation says it is. Only executable evidence may move a gate green.

## Layout

```
.harness/
├── README.md
├── project.manifest.json
├── project-context.md
├── rag.config.json
├── agents/            # active release roster (rp-*) + reference/disabled legacy
├── products/markets-v1/
│   ├── governance/    # operating contract, human gates, decisions, invariants
│   ├── planning/      # implementation-manifest.yaml, task-graph.yaml, traceability, plans/
│   ├── templates/     # task spec / handoff / verification / phase gate templates
│   ├── evidence/      # verification evidence (PHASE-1..4, intelligence)
│   └── release/       # release goal, repo map, routing, gates, policies, runbook
├── tasks/             # task specs
├── scripts/           # harness operational scripts (reconcile, worktree, validate, ...)
├── docs/
├── skills/
└── state/             # NO runtime state committed (no sqlite/db/logs)
```

## Agent roster

Active release fleet: `rp-release-orchestrator`, `rp-recovery-architect`, `rp-api-contract`, `rp-backend-markets`, `rp-web`, `rp-android`, `rp-qa-e2e`, `rp-sre-release`, `rp-review-security`.

Legacy agents are preserved under `agents/` as REFERENCE / DISABLED FOR MARKETS-V1 RELEASE.

## Worktrees

Canonical checkouts (`/opt/retropick`, `/opt/retropick-android`) are NOT worker scratchpads. Implementation happens in isolated worktrees under `/opt/worktrees/retropick/<task-id>/` — see `products/markets-v1/release/WORKTREE_POLICY.md`.
