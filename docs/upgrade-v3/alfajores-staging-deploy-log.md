# Alfajores staging deploy log

**Status:** PREVIEW — registry placeholders remain until operator broadcast (Sprint 2 P0.1).

## Decision

Target: **real staging** on Celo Alfajores after operator approval. Until broadcast completes, Alfajores remains **preview-only** (V3 flags off, API guard active).

## Prerequisites (operator)

| Item | Required |
|------|----------|
| Funded deployer | CELO on Alfajores for gas |
| Keystore | `forge script --account <name>` — no raw private keys |
| `CELO_RPC_URL` | e.g. `https://alfajores-forno.celo-testnet.org` |
| `MARKET_ENGINE_PROXY` | Existing ME on Alfajores **or** deploy ME first (RC-1.1) |
| Postgres migrated | Through `000015` |
| Registry path | `packages/contracts/registry.celo-alfajores.json` |

## RC-1.1 — MarketEngine (if not already deployed)

Deploy or note existing proxy address. Document in registry `contracts.marketEngineProxy`.

## RC-1.2 — Treasury stack

```bash
cd package/prediction-v2
export CELO_RPC_URL="https://alfajores-forno.celo-testnet.org"
export MARKET_ENGINE_PROXY="<market_engine_proxy>"

forge script script/DeployTreasuryAlfajores.s.sol:DeployTreasuryAlfajores \
  --rpc-url "$CELO_RPC_URL" \
  --broadcast \
  --account <keystore_account>
```

Record deployed addresses:

- `TreasuryVault`
- `RewardsVault`
- `CommunityPool`
- `FeeRouter`

## RC-1.3 — Wire MarketEngine treasury

On-chain: set MarketEngine `treasury` to FeeRouter (admin tx). Verify `withdrawFees` recipient is FeeRouter.

## RC-1.4 — Registry update

Edit [`packages/contracts/registry.celo-alfajores.json`](../../packages/contracts/registry.celo-alfajores.json):

- `marketEngineProxy` — non-zero
- `feeRouter`, `treasuryVault`, `rewardsVault`, `communityPool` — broadcast addresses
- Remove placeholder `0x000…` entries

## Verification checklist

```bash
# On-chain code present
cast code <fee_router> --rpc-url "$CELO_RPC_URL"
cast code <market_engine_proxy> --rpc-url "$CELO_RPC_URL"

# Backend starts with flags (after registry populated)
export REGISTRY_PATH=packages/contracts/registry.celo-alfajores.json
export GOODDOLLAR_ENABLED=1
export FEE_ROUTER_ENABLED=1
export FEE_ROUTER_ADDRESS=<fee_router>
# ... see demo-flags.md

# Smoke
./scripts/demo-alfajores-smoke.sh http://127.0.0.1:8080
```

## Deploy evidence (fill after broadcast)

| Contract | Address | Tx hash | Block | Date |
|----------|---------|---------|-------|------|
| MarketEngine proxy | | | | |
| FeeRouter | | | | |
| TreasuryVault | | | | |
| RewardsVault | | | | |
| CommunityPool | | | | |

## Smoke log

Attach `demo-alfajores-smoke.log` after successful staging run.
