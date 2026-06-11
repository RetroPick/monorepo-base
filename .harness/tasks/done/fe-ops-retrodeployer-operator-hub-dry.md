# fe-ops: RETRODEPLOYER reuses OpsOperatorHub

**Status:** done  
**Owner:** fe-ops / orchestrator

## Scope

Replace duplicated “Dashboard shortcuts” markup on `/retrodeployer` with shared `OpsOperatorHub` so shortcuts + runbook paths stay one source of truth (includes Templates, Oracle, self-link).

## Acceptance

- [x] `/retrodeployer` renders preflight then `OpsOperatorHub variant="theme"`.
- [x] No duplicate link list; workflow doc updated.
- [x] `pnpm -C apps/ops lint` && `pnpm -C apps/ops test` && `pnpm verify` green.

## Verify

`pnpm verify` (repo root).
