# fe-ops: preflight + operator hub on Overview (`/`)

## Owner

`fe-ops` (orchestrator slice)

## Goal

Ops home was the only primary route without **Deploy & prepare preflight** and **OpsOperatorHub**, so operators landing on `/` saw playbook + optional server snapshot only. Align with `docs/feature/ops-admin-operator-workflow.md`.

## Acceptance

- [x] `apps/ops-web/src/app/page.tsx` renders `<OpsDeployPreflight />` and `<OpsOperatorHub variant="theme" />` after intro, before playbook.
- [x] Playbook includes step **0** → `/` Overview.
- [x] Workflow doc step **0** documents Overview parity.
- [x] `pnpm -C apps/ops lint` && `pnpm -C apps/ops test` && `pnpm verify` green.

## Verify

`pnpm verify` (repo root)
