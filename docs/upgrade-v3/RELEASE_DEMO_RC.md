# Demo Release Candidate (V3)

Release branch: `release/demo-rc-v3`  
Baseline: V3 scaffolding + RC hardening (flags, guards, CI, runbooks).

## What is safe to claim now

- Upgrade V3 scaffolding implemented and locally verified (bus, migrations `000012`–`000015`, treasury contracts, fee/referral wiring, reporter/ops DB routes).
- Treasury deploy script validated on local Anvil (`DeployTreasuryAlfajores.s.sol`).
- Startup guard: V3 flags refuse placeholder `registry.celo-alfajores.json` addresses.

## Claim only after Alfajores E2E (RC-1.4)

- “Demo-ready on Celo Alfajores” / “GoodDollar live on Alfajores”
- Requires `./scripts/demo-alfajores-smoke.sh` log + non-placeholder registry + flags on staging

## Never claim without evidence

- GoodID verification live, EngagementRewards on-chain claims, daily market wallet writes, fee routing on Alfajores

## Demo-day decision tree

| Condition | Demo path |
|-----------|-----------|
| RC-1.4 smoke green + registry populated | Alfajores V3 — referral, impact API, fee-route ops |
| RC-1.4 not green | Base Sepolia fallback — markets, faucet, portfolio ([`demo-base-sepolia-fallback.md`](./demo-base-sepolia-fallback.md)) |
| Registry placeholders + flags on | **Blocked** — API/indexer fail fast |

## Verified commands (RC branch)

```bash
cd apps/backend && go build ./... && go test ./...
cd package/prediction-v2 && forge test --match-path "test/treasury/*"
cd apps/fe-v1 && pnpm test && pnpm typecheck
```

## Alfajores addresses

Populate after operator broadcast (RC-1.1–1.2):

| Contract | Address | Explorer |
|----------|---------|----------|
| marketEngineProxy | _pending RC-1.1_ | [Celoscan Alfajores](https://alfajores.celoscan.io) |
| feeRouter | _pending RC-1.2_ | |
| treasuryVault | _pending RC-1.2_ | |
| rewardsVault | _pending RC-1.2_ | |
| communityPool | _pending RC-1.2_ | |

Registry file: [`packages/contracts/registry.celo-alfajores.json`](../../packages/contracts/registry.celo-alfajores.json)

### RC-1.1 MarketEngine prerequisite

```bash
export CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
cast call $MARKET_ENGINE_PROXY "version()(string)" --rpc-url $CELO_RPC_URL
```

If no ME on Alfajores: deploy via `script/test/DeployTestnet.s.sol` with `EXPECTED_CHAIN_ID=44787`, or defer to Base Sepolia fallback.

### RC-1.2 Treasury broadcast

```bash
cd package/prediction-v2
export MARKET_ENGINE_PROXY=<proxy>
forge script script/DeployTreasuryAlfajores.s.sol:DeployTreasuryAlfajores \
  --rpc-url "$CELO_RPC_URL" --broadcast --account <keystore>
```

Update registry + set `FEE_ROUTER_ADDRESS` for indexer.

## Staging profile

- Env: [`compose.alfajores.env`](../../compose.alfajores.env)
- Runbook: [`demo-alfajores.md`](./demo-alfajores.md)
- Flags: [`demo-flags.md`](./demo-flags.md)

```bash
docker compose --env-file compose.alfajores.env up -d postgres migrator api indexer
./scripts/demo-alfajores-smoke.sh http://127.0.0.1:8080
```

## Observability (demo day)

| Check | URL / command |
|-------|----------------|
| Liveness | `GET /api/v1/livez`, `/readyz`, `/health` |
| Indexer caught up | `/api/v1/health` (indexer fields) or ops `global-state` |
| Fee batches | `GET /api/v1/ops/fee-router/batches` (JWT) |
| Reporter queue | `GET /api/v1/reporter/pending` |
| Production smoke | `./scripts/smoke-production.sh <api_base>` |

### WebSocket channels

Allowed in API (`cmd/api/main.go`):

| Channel | Auth | Payload hint |
|---------|------|----------------|
| `impact:gooddollar` | public | `fee_routed` after FeeRouter tx |
| `reward:treasury` | wallet JWT | treasury fee withdraw events |
| `referral:<wallet>` | wallet JWT | referral reward events |

Subscribe via `wscat` or fe-v1 devtools; dedupe keys like `fee_routed:<txHash>:<logIndex>`.

## Known limitations (RC scope)

- Daily market: preview UI only (no wallet write)
- GoodID / EngagementRewards: API stubs
- Indexer bus strangler not complete (inline handlers remain)
- No MarketEngine+FeeRouter integration test in Foundry
- `rewards-worker` optional; not in default compose

## Fallback rehearsal

See [`demo-base-sepolia-fallback.md`](./demo-base-sepolia-fallback.md) and [`demo-base-sepolia-rehearsal.log`](./demo-base-sepolia-rehearsal.log).

## Final QA

Run the Protocol Camp Demo Day QA pass from a **new** Cursor chat using [`cursor-demo-day-qa-prompt.md`](./cursor-demo-day-qa-prompt.md).

Expected output: [`DEMO_DAY_QA_REPORT.md`](./DEMO_DAY_QA_REPORT.md) (created by the QA agent; target verdict **GO** unless a P0 blocker is found).
