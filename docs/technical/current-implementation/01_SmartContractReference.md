# 01 Smart Contract Reference

> **Canonical:** [`package/prediction-v2/currentSmartContract.md`](../../../package/prediction-v2/currentSmartContract.md).

## Scope
Canonical reference source: `package/prediction-v2/currentSmartContract.md`.

This file summarizes the current on-chain `MarketEngine` implementation model used by backend/frontend integrations.

## Core Contract Topology
- Engine is deployed as a **UUPS proxy** with `MarketEngineDispatcher` as implementation root.
- Root bytecode handles admin/user hot paths directly; selected lifecycle/view selectors delegate to module contracts.
- Shared storage layout is centralized in `MarketEngineState` and used by dispatcher + modules.

## Market Model
- Market identity is template-based (`templateId = keccak256(bytes(slug))`).
- Each template runs epoch/round lifecycle with one active epoch cursor per template ledger.
- Position records are keyed by `(templateId, epochId, user)` and hold per-outcome stake/claim accounting.

## Epoch Lifecycle
- **Manual mode**: `openEpoch -> lockEpoch -> resolveEpoch -> claim`.
- **Rolling mode**: genesis bootstrap then steady-state `executeRollingRound` pipeline (`resolve -> lock -> open` in one keeper tick).
- Claims are user pull-based (`claim`, `claimMany`) from reserved claim pools.

## Settlement Semantics
- Settlement behavior depends on `marketType` and checkpoint requirements.
- Core outputs include winner mask, claim liability, settlement fee totals, and refund/void mode where relevant.
- Reserve accounting separates active collateral vs claim reserves vs fee reserves.

## Oracle Model
- Supports Chainlink adapter family and trusted reporter templates.
- Lock-time checkpoint A required for selected market types (e.g., Direction/Velocity/Convergence/Composite in Chainlink paths).
- Resolve writes checkpoint B and optional type-specific checkpoint sets.
- Staleness/confidence limits are enforced through per-template/per-epoch effective oracle config.

## Rolling Constraints
- Rolling is Chainlink-only and only for allowed market types.
- Certain complex types are manual-only by validation (e.g., Convergence/Composite/Corridor/Cascade).
- Rolling can halt due to buffer misses or oracle conditions; recovery is explicit and operator-driven.

## Roles and Permissions
- `admin`: governance/configuration/upgrades.
- `workerAuthority`: lifecycle keepers.
- `treasury`: protocol fee recipient.
- User entrypoints are separated from worker/admin operational entrypoints.

## Accounting and Yield Notes
- Protocol fees accumulate in fee reserves; claim liabilities remain in claim reserves.
- Optional yield-router integration adds routed principal/yield accounting into resolve/cancel flows.
- Withdrawal of fees is treasury/admin-authorized and reserve-gated.

## Why This Matters To Backend/Frontend
- Backend indexer event handling and projection schema mirror this lifecycle model.
- Frontend trade flows must follow approve/deposit/switch/claim semantics and epoch state windows.
- Portfolio/claim views depend on understanding refund mode, winner masks, and claimability transitions.

## Primary Source Files
- `package/prediction-v2/currentSmartContract.md`
- `package/prediction-v2/src/engine/MarketEngineDispatcher.sol`
- `package/prediction-v2/src/engine/modules/`
- `package/prediction-v2/src/types/MarketTypes.sol`
