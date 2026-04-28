# Frontend Architecture Scaffold

## Purpose

The frontend layer has two experiences:

- user app for markets, deposits, switches, claims, portfolio, and Base Sepolia faucet support
- operator app for health, keeper schedule, oracle state, incident response, and prepared governance actions

Both apps use the shared ABI/address registry in [`../abi-map.md`](../abi-map.md).

## Data Model

Default UI data flow:

1. API serves indexed PostgreSQL state.
2. WebSocket pushes indexed updates.
3. Wallet submits user transactions directly to chain.
4. UI waits for indexed confirmation and shows data freshness.

Direct chain reads:

- user app: only for wallet simulation and allowance/balance checks
- operator app: only through explicit live refresh or transaction preparation

## Shared Frontend Packages

Future implementation should isolate:

- `contracts`: viem/wagmi contract configs from registry
- `api`: typed REST client
- `ws`: reconnecting WebSocket client
- `format`: e8 price formatting, token amount formatting, enum labels
- `market-types`: labels and compatibility rules from `currentSmartContract.md`
- `tx`: transaction simulation, wallet submit, indexed confirmation tracking
- `env`: environment and chain config

## Contract Config

Frontend should generate contract config from the registry:

- `marketEngine`: proxy address plus `IMarketEngine` ABI
- `dispatcher`: proxy address plus `MarketEngineDispatcher` ABI for operator-only screens
- `stakeToken`: Base Sepolia mock ERC20 address plus token ABI
- `faucet`: Base Sepolia faucet address plus faucet ABI

Do not hardcode implementation or module addresses into user transaction code.

## UX State Rules

- Show `globalPaused` prominently.
- Show stale indexed data with `lastSyncAt`.
- Show rolling halted state before any deposit/switch action.
- Show oracle and resolver labels for every market.
- Show claimable/refund states from indexed state and position view.
- For Base Sepolia, show faucet tooling only when `chainId == 84532`.

## User and Operator Split

The user app should not expose privileged controls.

The operator app should not hide the operational consequences of actions:

- every prepared transaction shows required role
- every action links to runbook guidance
- every critical state displays the exact getter or event source
- production actions are flagged as Safe/governance-required
