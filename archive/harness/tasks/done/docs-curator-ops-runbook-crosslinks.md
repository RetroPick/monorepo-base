# docs-curator: ops workflow ↔ runbook crosslinks

## Scope

Ensure `docs/feature/ops-admin-operator-workflow.md`, `ORCHESTRATOR.md`, and `.dev/backend/operations-runbook.md` reference each other with valid relative paths.

## Acceptance

- [x] No broken relative links from the three files above.
- [x] `cli/harness doctor projects/retropick` clean.

## Owner

`docs-curator`

## Done

- Bidirectional markdown links: workflow ↔ ORCHESTRATOR ↔ operations-runbook; workflow and ORCHESTRATOR also link PRODUCTION where relevant for operator context.
