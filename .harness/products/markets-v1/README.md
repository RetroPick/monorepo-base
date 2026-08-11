# RetroPick Markets V1 — Release Factory Product

Execution policy, planning, templates, evidence, and release policy for **RetroPick Markets V1** (Polymarket-native; Web + Android clients on a shared Go Markets BFF).

> Product/architecture specification lives in `.dev/markets-v1/`. This tree is execution policy — the two must not be confused.

## Contents

| Path | Purpose |
|---|---|
| `governance/` | Operating contract, blockers & human approvals, decision/assumption log, invariant check |
| `planning/` | `implementation-manifest.yaml` (live `current_phase`), `task-graph.yaml`, requirements→task traceability, `plans/` |
| `templates/` | Task spec, agent handoff, verification evidence, phase gate templates |
| `evidence/verification/` | Verification evidence per phase (PHASE-1 … PHASE-4, intelligence) |
| `release/` | Release goal, repo map, routing, gates, human gates, release-state schema, worktree/resource policy, runbook |

## Consumption order

1. `governance/AGENT_OPERATING_CONTRACT.md`
2. `planning/implementation-manifest.yaml` — read `current_phase`
3. `planning/task-graph.yaml` — select one ready task
4. `planning/REQUIREMENTS_TO_TASK_TRACEABILITY.md`
5. `templates/TASK_SPEC_TEMPLATE.md` — spec the task
6. implement → verify → fill `VERIFICATION_EVIDENCE_TEMPLATE.md` → handoff via `AGENT_HANDOFF_TEMPLATE.md`
7. `governance/INVARIANT_CHECK.md` — run invariants before phase advance

## Phase vs runtime truth

`current_phase` in the manifest is **policy/intent**, not proof. Git + tests + CI + staging evidence are runtime truth. Whenever they disagree, create a reconciliation finding — do not silently pick one.
