# Alfajores end-to-end demo

Prerequisites: Postgres migrated through `000015`, backend feature flags enabled, contracts deployed on Celo Alfajores.

See also: [`demo-flags.md`](./demo-flags.md), [`RELEASE_DEMO_RC.md`](./RELEASE_DEMO_RC.md), [`alfajores-staging-deploy-log.md`](./alfajores-staging-deploy-log.md), [`compose.alfajores.env`](../../compose.alfajores.env).

## Staging stack

```bash
docker compose -f docker-compose.yml -f docker-compose.alfajores.yml \
  --env-file compose.alfajores.env up -d postgres migrator api indexer
# Optional rewards-worker when IMPACT_ENABLED=1 (not in default compose)
```

Set `REGISTRY_PATH` in compose to the populated Alfajores registry after broadcast. **Do not enable V3 flags while registry contains `0x000…` placeholders** — API/indexer refuse startup.

## Enable flags

Only after RC-1.1 (ME) and RC-1.2 (treasury) are complete:

```bash
export REGISTRY_PATH=packages/contracts/registry.celo-alfajores.json
export GOODDOLLAR_ENABLED=1
export REFERRALS_ENABLED=1
export REWARDS_ENABLED=1
export IMPACT_ENABLED=1
export FEE_ROUTER_ENABLED=1
export FEE_ROUTER_ADDRESS=<deployed_fee_router>
export CELO_CHAIN_ID=44787
export RPC_URL=https://alfajores-forno.celo-testnet.org
export VITE_GOODDOLLAR_ENABLED=1
```

## Smoke flow

Automated subset: `./scripts/demo-alfajores-smoke.sh http://127.0.0.1:8080` → `demo-alfajores-smoke.log`

Manual:

1. Start stack: API, indexer, keeper (optional), rewards-worker (optional).
2. Open `fe-v1` → `/app/gooddollar`.
3. Connect wallet on Alfajores; confirm G$ status API returns balance (API-only; GoodID not live).
4. Daily market: **preview UI** — on-chain entry not wired in RC.
5. Referral + impact: apply referral code; verify `referral_bindings` / ops fee batches after route tx.
6. Ops: `GET /api/v1/ops/fee-router/batches` after route tx.
7. Impact dashboard at `/app/gooddollar/impact`; WS `impact:gooddollar` for `fee_routed`.

**Not live in RC:** EngagementRewards on-chain claim, GoodID external API, daily market wallet write.

## Registry

Update addresses in [`packages/contracts/registry.celo-alfajores.json`](../../packages/contracts/registry.celo-alfajores.json) after broadcast:

```bash
cd contracts/legacy-pool-v1
export CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
export MARKET_ENGINE_PROXY=<deployed_market_engine_proxy>
forge script script/DeployTreasuryAlfajores.s.sol:DeployTreasuryAlfajores \
  --rpc-url "$CELO_RPC_URL" --broadcast --account <foundry_account>
```

Set `FEE_ROUTER_ADDRESS` to the deployed FeeRouter for indexer batch ingestion.

## Verification commands

```bash
cd apps/backend && go test ./...
cd contracts/legacy-pool-v1 && forge test --match-path test/treasury/*
cd apps/web && pnpm test
```
