# be-keeper: operator smoke sequence

## Scope

Align `.dev/backend/keeper.md` and `.dev/backend/operations-runbook.md` with a short, copy-pasteable operator sequence (curl or script under `scripts/`) for pre-rotation checks.

## Acceptance

- [x] Doc updated with sequence; optional script is non-interactive and safe without secrets in argv.
- [x] `pnpm smoke` exit 0.

## Owner

`be-keeper`

## Delivered

- `scripts/keeper-operator-smoke.sh` — public API probes; optional `RETROPICK_OPS_JWT` for `/api/v1/ops/keeper/*` (JWT never accepted as argv).
- `.dev/backend/keeper.md` — **Operator smoke** section (script + curl table + interpretation).
- `.dev/backend/operations-runbook.md` — **Pre-rotation / handoff smoke** under keeper diagnosis.
- `docs/feature/ops-admin-operator-workflow.md` — step 5 links script + keeper doc anchor.
