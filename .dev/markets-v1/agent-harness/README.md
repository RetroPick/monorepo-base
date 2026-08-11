# agent-harness — Compatibility Pointer

**Execution harness moved to `.harness/products/markets-v1/`.**
This directory is a compatibility pointer only.

Canonical locations:

| Former artifact | Canonical location |
|---|---|
| AGENT_OPERATING_CONTRACT.md | `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md` |
| BLOCKERS_AND_HUMAN_APPROVALS.md | `.harness/products/markets-v1/governance/` |
| DECISION_AND_ASSUMPTION_LOG.md | `.harness/products/markets-v1/governance/` |
| INVARIANT_CHECK.md | `.harness/products/markets-v1/governance/` |
| implementation-manifest.yaml | `.harness/products/markets-v1/planning/` |
| task-graph.yaml | `.harness/products/markets-v1/planning/` |
| REQUIREMENTS_TO_TASK_TRACEABILITY.md | `.harness/products/markets-v1/planning/` |
| plans/** | `.harness/products/markets-v1/planning/plans/**` |
| TASK_SPEC_TEMPLATE.md | `.harness/products/markets-v1/templates/` |
| AGENT_HANDOFF_TEMPLATE.md | `.harness/products/markets-v1/templates/` |
| VERIFICATION_EVIDENCE_TEMPLATE.md | `.harness/products/markets-v1/templates/` |
| PHASE_GATE_TEMPLATE.md | `.harness/products/markets-v1/templates/` |
| verification/** | `.harness/products/markets-v1/evidence/verification/**` |

There is deliberately **no duplicate** `task-graph.yaml` or `implementation-manifest.yaml` here. The canonical copies live under `.harness/products/markets-v1/planning/` only.

**Do not add new execution artifacts to this directory.** Product/specification documentation continues to live under `.dev/markets-v1/` (see [../README.md](../README.md)); execution policy and evidence live under `.harness/products/markets-v1/`.
