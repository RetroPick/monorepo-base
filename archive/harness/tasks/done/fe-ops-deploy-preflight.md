# fe-ops: deploy preflight on Launch + Prepare

## Scope

Shared **Deploy & prepare preflight** panel on `/launch` and `/prepare` (generic explorer): parallel `health`, `global-state`, optional `tx/prepare/meta`, public RPC head; indexer lag helper + Vitest.

## Acceptance

- [x] Preflight component visible on both routes; refresh invalidates query.
- [x] `apps/ops-web` Vitest includes `opsPreflight` unit tests.
- [x] `docs/feature/ops-admin-operator-workflow.md` references the UI strip.

## Verify

```bash
cd apps/ops && pnpm lint && pnpm test
pnpm verify   # from repo root
```

**2026-05-26:** `pnpm -C apps/ops lint`, `pnpm -C apps/ops test` (6 tests), `pnpm verify` — all exit 0.

## Owner

`fe-ops` (orchestrator report: link this file + PR section).
