# fe-ops: preflight on `/keeper` and `/retrodeployer`

## Goal

Reuse **Deploy & prepare preflight** on operator routes that sit after launch/prepare in the runbook so env sanity is one click before reviewing keeper rows or shell deploy steps.

## Acceptance

- [x] `/keeper` renders `<OpsDeployPreflight />` under the page intro.
- [x] `/retrodeployer` renders the same strip plus in-app links to Prepare / Launch / Monitor / Keeper / Incidents.
- [x] `docs/feature/ops-admin-operator-workflow.md` updated for steps 5 and 9.
- [x] `pnpm -C apps/ops lint` && `pnpm -C apps/ops test` && `pnpm verify` pass.

## Owner

`fe-ops` (orchestrator slice).
