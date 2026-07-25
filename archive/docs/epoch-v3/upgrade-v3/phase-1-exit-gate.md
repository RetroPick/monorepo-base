# Phase 1 Exit Gate

Phase 2 (GoodDollar integration) must not begin until all criteria below pass.

Evidence from verification audit (2026-07-02): local `go test ./...`, `forge test --match-path test/treasury/*`, and `pnpm test` in `fe-v1` were executed on the audit machine after P0 wiring fixes.

## Contracts

- [x] `FeeRouter`, `TreasuryVault`, `RewardsVault`, `CommunityPool` implemented under `contracts/legacy-pool-v1/src/treasury/`
- [x] Foundry unit tests green for treasury contracts (`8/8` in `test/treasury/*`)
- [x] Invariant fuzz test passes for valid fee allocations (`test/treasury/invariant/FeeRouter.invariant.t.sol`)
- [x] MarketEngine settlement paths unchanged; dedicated MarketEngine+FeeRouter integration test (`test/integration/MarketEngineFeeRouter.t.sol`)
- [x] Storage-layout CI passes for new contracts (`contracts/legacy-pool-v1/script/check-storage-layout.sh`)

## Backend

- [x] `internal/platform/bus` wired with in-process event bus
- [x] Indexer decodes logs, persists `chain_events`, publishes to bus
- [x] `FeesWithdrawn` bus subscriber calls `referrals.ProcessFeeEvent` and inserts `fee_events`
- [x] FeeRouter `FeesRouted` logs indexed when `FEE_ROUTER_ADDRESS` is set; batches persist to `fee_route_batches`
- [ ] Market/epoch/realtime/keeper fully extracted to bus subscribers (inline handlers remain for parity)
- [x] Migrations `000012`–`000015` present; apply via `go run ./cmd/migrator` against Postgres
- [x] Reporter v3 `submit` / `approve` / `reject` persist to `reporter_submissions` + audit log
- [x] Ops `GET /api/v1/ops/fee-router/batches` reads `fee_route_batches` when `FEE_ROUTER_ENABLED=1`
- [x] V3 API route groups mounted with feature flags (`GOODDOLLAR_ENABLED=0` default)
- [x] Startup guard refuses V3 flags when Alfajores registry has placeholder treasury addresses (`validateV3Config`)
- [x] WS allowlist includes `reward:`, `referral:`, `impact:gooddollar`; publishers emit on fee withdraw/route

## Tests

- [x] `go test ./...` in `apps/backend`
- [x] `forge test --match-path test/treasury/*` in `contracts/legacy-pool-v1`
- [x] `fe-v1` vitest suite (`pnpm test`)
- [x] CI: migration V3 smoke (`TestMigrationV3`), sqlc drift check, treasury match-path in contracts workflow

## Documentation

- [x] This `docs/upgrade-v3/` index published
- [x] `DECISIONS.md` V3 entries (D10–D14) recorded
- [x] `demo-flags.md`, `RELEASE_DEMO_RC.md`, Base Sepolia fallback runbook

## Deploy / demo

- [x] `script/DeployTreasuryAlfajores.s.sol` added; `packages/legacy/abi/FeeRouter.json` generated
- [ ] Alfajores registry populated with live addresses (requires operator broadcast + `MARKET_ENGINE_PROXY`)
- [ ] End-to-end Alfajores demo per `demo-alfajores.md` (wallet writes + live route tx)
