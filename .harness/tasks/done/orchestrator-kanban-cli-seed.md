---
id: task_orchestrator_kanban_cli_seed
kanban_id:
title: Orchestrator — Hermes Kanban CLI seed for retropick-v1
phase: phase0
status: done
---

# Orchestrator — Hermes Kanban CLI seed

## Objective

Populate empty `retropick-v1` Triage via `hermes kanban create --triage` so the dashboard shows work without manual copy-paste.

## Acceptance

- [x] Idempotent script `scripts/seed-kanban-retropick-v1.sh` (eight cards, `retropick-v1-seed-*` keys)
- [x] Doc [`.harness/docs/kanban-seed-retropick-v1.md`](../../docs/kanban-seed-retropick-v1.md) documents one-command seed
- [x] `ORCHESTRATOR.md` Kanban section references script

## Verification

```bash
pnpm verify
hermes kanban --board retropick-v1 stats
```
