# Production Hardening Report — Sprint 1 (P0)

**Branch:** `production/testnet-hardening-v1`  
**Date:** 2026-07-03  
**Baseline:** Demo tag `protocol-camp-demo-go-2026-07-03` on `release/demo-rc-v3`

## Sprint goal

Close P0 gaps between Demo Day GO and production-grade testnet readiness: Foundry green, storage-layout CI, stronger CI matrix, indexer idempotency documentation/tests, extended smoke gates.

## P0 deliverables

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| P0.1 | Freeze demo QA + tag | Done (prior commit) | `protocol-camp-demo-go-2026-07-03`, `DEMO_DAY_QA_REPORT.md` |
| P0.2 | Foundry script suite green | Done | `ScriptTestEnvReset.sol`, `isolate` on script contracts, CI `-j1` |
| P0.3 | CI matrix hardening | Done | `ci.yml`: `go build`, graphify freshness; `contracts.yml`: `-j1`, storage-layout |
| P0.4 | Storage-layout CI | Done | `script/check-storage-layout.sh`, `.storage-layout/*.json`, `storage-layout.md` |
| P0.5 | Indexer idempotency | Done | `idempotency_test.go`, `indexer-projection-map.md` |
| P0.7 | Smoke extensions | Done | `smoke-production.sh` contracts + gooddollar checks; `smoke-base-sepolia.sh` |

## Verification commands

```bash
# Contracts (must use -j1 — vm.setEnv is process-global)
cd package/prediction-v2
FOUNDRY_PROFILE=ci forge test -j1
./script/check-storage-layout.sh

# Backend
go -C apps/backend build ./...
go -C apps/backend test ./...

# Monorepo (existing gates)
pnpm typecheck && pnpm test && pnpm build

# Smoke (API must be running with registry loaded)
RETROPICK_API_BASE=http://127.0.0.1:8080 ./scripts/smoke-production.sh

# Graphify (optional locally if graphify installed)
bash scripts/check-graphify-freshness.sh
```

## P0.2 — Foundry root cause

Script tests call `vm.setEnv`, which Foundry shares across parallel test workers. Without `-j1`, deploy/modular suites race on `STAKE_TOKEN`, `DEPLOY_FAUCET`, and `ENGINE_PROXY`, producing flaky failures.

**Fix:** shared `ScriptTestEnvReset.reset(vm)` in all script test `setUp()` hooks + **mandatory** `forge test -j1` in CI.

## P0.4 — Storage layout

Tracked contracts: `MarketEngineDispatcher`, `MarketEngineAdminModule`, `MarketEngineViewModule`, `FeeRouter`. Baselines live under `package/prediction-v2/.storage-layout/`.

## P0.5 — Indexer

- `chain_events` and `fee_route_batches` use `ON CONFLICT (tx_hash, log_index) DO NOTHING`.
- Reorg path deletes `chain_events` above `rewindTo` and truncates live projection tables (64-block rewind).
- See [`indexer-projection-map.md`](./indexer-projection-map.md).

## Smoke additions

- `GET /api/v1/config/contracts` — `contracts.marketEngineProxy` must be non-zero.
- `GET /api/v1/gooddollar/status` — expects `404 feature_disabled` when flags off.

## Still open (Sprint 2+)

- Alfajores registry population + E2E (`demo-alfajores.md`)
- MarketEngine + FeeRouter integration Foundry test (phase-1 exit gate)
- Bus extraction for remaining inline indexer projections
- Full `FOUNDRY_PROFILE=ci forge test -j1` runtime budget in CI (long suite; monitor)

## Verdict

**Sprint 1 P0: complete** — CI gates and documentation are in place for testnet hardening. Alfajores live deploy and ME+FeeRouter integration test remain operator/Sprint 2 work.
