# Production Hardening Report — Sprint 1 (P0)

**Branch:** `production/testnet-hardening-v1`  
**Date:** 2026-07-03  
**Baseline:** Demo tag `protocol-camp-demo-go-2026-07-03` on `release/demo-rc-v3`

## Sprint goal

Close P0 gaps between Demo Day GO and production-grade testnet readiness: Foundry green, storage-layout CI, stronger CI matrix, indexer idempotency documentation/tests, extended smoke gates.

## P0 deliverables

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| P0.1 | Freeze demo QA + tag | Done | `protocol-camp-demo-go-2026-07-03`; hardening `1ea340269` |
| P0.2 | Foundry script suite green | Done | `ScriptTestEnvReset.sol`, `isolate` on script contracts, CI `-j1` |
| P0.3 | CI matrix hardening | Done | `ci.yml`: `go build`, graphify freshness; `contracts.yml`: `-j1`, storage-layout |
| P0.4 | Storage-layout CI | Done | `script/check-storage-layout.sh`, `.storage-layout/*.json`, `storage-layout.md` |
| P0.5 | Indexer idempotency | Done | `idempotency_test.go`, `indexer-projection-map.md` |
| P0.7 | Smoke extensions | Done | `smoke-production.sh` contracts + gooddollar checks; `smoke-base-sepolia.sh` |

## Verification commands

```bash
# Contracts (must use -j1 — vm.setEnv is process-global)
cd contracts/legacy-pool-v1
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

Tracked contracts: `MarketEngineDispatcher`, `MarketEngineAdminModule`, `MarketEngineViewModule`, `FeeRouter`. Baselines live under `contracts/legacy-pool-v1/.storage-layout/`.

## P0.5 — Indexer

- `chain_events` and `fee_route_batches` use `ON CONFLICT (tx_hash, log_index) DO NOTHING`.
- Reorg path deletes `chain_events` above `rewindTo` and truncates live projection tables (64-block rewind).
- See [`indexer-projection-map.md`](./indexer-projection-map.md).

## Smoke additions

- `GET /api/v1/config/contracts` — `contracts.marketEngineProxy` must be non-zero.
- `GET /api/v1/gooddollar/status` — expects `404 feature_disabled` when flags off.

## Verdict

**Sprint 1 P0: complete** — commit `1ea340269`, tag `testnet-hardening-sprint1-green-2026-07-03`.

## Sprint 2 — Real Staging Integration

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| P0.1 | Alfajores real staging | Prerequisites doc | `alfajores-staging-deploy-log.md` — broadcast pending operator approval |
| P0.2 | ME + FeeRouter integration | Done | `test/integration/MarketEngineFeeRouter.t.sol` (5 tests) |
| P0.3 | Indexer bus strangler | Done | `FeesRouted` → bus owns `fee_route_batches` + realtime |
| P0.4 | Oracle/lifecycle coverage | Done | `MarketEngineProductionLifecycle.t.sol`, `lifecycle-oracle-coverage.md` |
| P0.5 | Staging smoke + observability | Done | `smoke-production.sh` readyz/metrics/fee-router checks |

### Sprint 2 verification

```bash
go -C apps/backend test ./internal/indexer/... -count=1
cd contracts/legacy-pool-v1
FOUNDRY_PROFILE=ci forge test -j1 --match-path "test/integration/*FeeRouter*"
FOUNDRY_PROFILE=ci forge test -j1 --match-contract MarketEngineProductionLifecycleTest
RETROPICK_API_BASE=http://127.0.0.1:8080 ./scripts/smoke-production.sh
```

**Alfajores blocker:** registry still has `0x000…` placeholders — operator must run deploy per `alfajores-staging-deploy-log.md` before claiming staging-live.
