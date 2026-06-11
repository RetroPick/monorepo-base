# fe-ops: preflight + operator hub on `/monitor` and `/incidents`

## Acceptance

- [x] `/monitor` renders `OpsDeployPreflight` and `OpsOperatorHub` (shortcuts + repo runbook paths) above server-fetched aggregates.
- [x] `/incidents` renders the same client preflight + hub (zinc variant) above the incident list.
- [x] `docs/feature/ops-admin-operator-workflow.md` steps 1 and 7 describe the UI.
- [x] `pnpm -C apps/ops lint`, `pnpm -C apps/ops test`, `pnpm verify` pass.

## Notes

Runbook links are **paths in the clone**, not URLs, because the ops app has no bundled copy of those markdown files.
