# be-api: indexer health contract for ops — done

## Scope

Stabilize fields used by ops dashboards (`/api/v1/health`, `global-state`, or adjacent) so indexer lag and environment tags remain machine-consumable.

## Acceptance

- [x] Go tests cover any new/changed JSON fields or backward-compatible aliases.
- [x] `pnpm smoke` exit 0; ops preflight still parses responses.

## Owner

`be-api`

## Notes

- `healthOKPayload` adds `schemaVersion`, `environment`, `chainId`, `indexedBlock` alias, nested `indexer` (same keys as `/ops/global-state`), `contracts.marketEngineProxy`.
- DB failure path on `/health` now includes `schemaVersion`, `environment`, `chainId`.
- Types: `apps/ops/src/lib/api.ts` (`OpsHealth`), `apps/fe-v1/src/lib/api/retropickApi.ts` (`HealthResponse`).
