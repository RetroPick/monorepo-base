# RetroPick Market Engine (Solidity)

Foundry port of the Anchor program [`retropick_market_engine_v5`](../retropick_market_engine_v5/) with matching math, epoch lifecycle, oracle normalization (e8), and three-bucket vault accounting (`active`, `claims`, `fees`) per market template.

For deployment economics, keeper gas, epoch limits, and standing up a new market instance, see [DEPLOYMENT_AND_EPOCHS.md](./DEPLOYMENT_AND_EPOCHS.md).

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Submodules: `git submodule update --init --recursive` (OpenZeppelin + `forge-std`)

## Build and test

```bash
forge build
forge test -vvv
```

## Operations budget (rollups / L2)

Recurring **keeper** work depends on **execution mode**:

- **Manual:** **three** txs per epoch per template: `openEpoch`, `lockEpoch`, `resolveEpoch`.
- **Rolling (Direction):** **one** tx per interval in steady state (`executeRollingRound`), plus a **two-tx** genesis bootstrap per session.

Monthly cost is approximately:

`keeper_txs_per_month × (L2_execution_gas + L1_data_fee_on_OP_Stack) × gas_price × ETH_USD`

**Measure locally** (relative gas, before chain-specific fees):

```bash
forge snapshot --match-contract 'EpochGasTest|MarketEngineRollingTest'
cat .gas-snapshot
```

Use `EpochGasTest:test_gas_*` for Manual paths and `MarketEngineRollingTest:test_gas_*` for Rolling; multiply by your sequencer’s gas price and (on OP Stack) the L1 fee from `eth_estimateGas` / block explorer “L1 gas used” fields.

**Also batch**: `openEpochsBatch`, `lockEpochsBatch`, and `resolveEpochsBatch` amortize fixed per-tx overhead when one keeper maintains many templates in one block.

**Rolling mode** (Direction-only): `genesisStartRolling` → `genesisLockRolling` → repeating `executeRollingRound` bundles resolve + lock + open into **one keeper tx** per tick—see [DEPLOYMENT_AND_EPOCHS.md](./DEPLOYMENT_AND_EPOCHS.md#rolling-execution-mode-keeper-cost-reduction).

**Production bytecode**: `FOUNDRY_PROFILE=production forge build` uses `optimizer_runs = 1_000_000` in [`foundry.toml`](foundry.toml) (smaller runtime, larger bytecode). For deploy-size experiments use `FOUNDRY_PROFILE=deploybudget`. Compare with `forge build --sizes`.

## Deploy (chain-agnostic)

### Production-style (`PythAdapter` + env)

Set:

| Variable | Meaning |
|----------|---------|
| `PRIVATE_KEY` | Broadcast wallet (must equal `MarketEngine` deployer for `initializeConfig`) |
| `STAKE_TOKEN` | ERC20 used as collateral |
| `PYTH` | Pyth `IPyth` contract on the target chain |
| `ADMIN` | Admin pubkey |
| `TREASURY` | Treasury pubkey (fee withdrawals) |
| `WORKER` | Worker pubkey |
| `DEFAULT_SETTLEMENT_FEE_BPS` | Protocol default (bps), e.g. `100` |
| `MAX_SWITCH_FEE_BPS` | Cap for template switch fee |
| `MAX_OUTCOMES` | Max outcomes (≤ 8) |
| `ORACLE_MAX_DELAY_SECONDS` | Passed to Pyth age check |
| `ORACLE_MAX_CONFIDENCE_BPS` | Max confidence vs \|price\| |

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --broadcast
```

### Local / mock oracle

```bash
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast
```

## Security notes

See [AUDIT_SOLIDITY.md](./AUDIT_SOLIDITY.md). Optional Slither run: `.github/workflows/slither.yml` (`workflow_dispatch`).

## Layout

- `src/MarketEngine.sol` — core protocol
- `src/math/MarketMath.sol`, `src/logic/Resolvers.sol`, `src/oracle/OracleNormalize.sol`
- `src/adapters/PythAdapter.sol`, `src/interfaces/IPriceOracle.sol`
- `src/vendor/pyth/` — minimal vendored `IPyth` / structs
