# Backend Operator Surface

## Purpose

This document maps operator backend behavior to ABI surfaces and the `.operator` runbook. Operator endpoints are for inspection, calldata preparation, incident tracking, and audit evidence. Privileged execution must follow the governance path for the environment.

## Operator Reads

Primary ABI: `IMarketEngine` at the MarketEngine proxy.

- `getOperatorGlobalView()`
- `getOperatorTemplateView(templateId)`
- `getEpochView(templateId, epochId)`
- `getTemplateYieldView(templateId)`
- `getMarketView(templateId)`
- `getRollingLifecycle(templateId)`
- `unreconciledRecoveredByTemplate(templateId)`
- `templates(templateId)`
- `ledgers(templateId)`
- `epochs(templateId, epochId)`

Dispatcher-specific reads:

- `getSelectorModule(selector)`
- `isRootOwnedSelector(selector)`
- `isModuleApproved(module)`
- `isModuleCodeHashAllowed(codeHash)`
- `getModuleCodeHash(module)`
- `proxiableUUID()`

## Operator Action Map

| Category | ABI | Functions | Execution path |
|---|---|---|---|
| Pause and config | `IMarketEngine` / dispatcher | `pauseProgram`, `setTreasury`, `setWorkerAuthority`, `setDepositExecutor` | Safe/operator wallet |
| Market setup | `IMarketEngine` | `upsertTemplate`, `initializeMarket` | Safe/operator wallet |
| Manual lifecycle | `IMarketEngine` | `openEpoch`, `lockEpoch`, `resolveEpoch`, `cancelEpoch` | worker/admin wallet or keeper |
| Rolling lifecycle | `IMarketEngine` | `genesisStartRolling`, `genesisLockRolling`, `executeRollingRound`, `haltRollingMarket`, `cancelRollingEpochWhileHalted`, `resetRollingLifecycle` | worker/admin wallet or keeper |
| Yield routing | `IMarketEngine` | `setYieldRouter`, `setLmRewardsEnabled`, `keeperClaimLmRewards`, recovery functions | Safe/operator wallet |
| Oracle admin | `IMarketEngine` | `setRateOracle`, `setSmartDataOracle`, `setMacroOracle`, `setEquityOracle`, `resetOracleCursor` | Safe/operator wallet |
| Fees | `IMarketEngine` | `withdrawFees` | treasury/admin path |
| Module governance | `MarketEngineDispatcher` | `allowModuleCodeHash`, `registerModule`, `revokeModule`, `setSelectorModule` | Safe only |
| Upgrade | `MarketEngineDispatcher` | `upgradeToAndCall` | Safe only |

## Prepared Transaction Endpoint

`POST /api/v1/ops/tx/prepare` should return:

- target address
- chain id
- ABI name
- function signature
- typed args
- encoded calldata
- value
- required role
- runbook reference
- expected events
- post-action validation reads

It should not sign or broadcast governance transactions.

## Live Refresh

Operator endpoints may accept `?live=true` to perform direct chain reads.

Use direct reads for:

- incident evidence capture
- pre-unpause validation
- module/selector verification
- keeper preflight debugging

Default dashboard refresh should come from PostgreSQL projections to preserve public-RPC budget.

## Incident Alignment

Every critical operator event should map into an incident or audit timeline:

- `RollingHalted`
- `YieldRouterDisabled`
- `YieldEmergencyWithdrawn`
- `EmergencyRecoveredBalanceReassigned`
- `OracleCursorReset`
- `ModuleRegistered`
- `ModuleRevoked`
- `SelectorModuleSet`
- `Upgraded`
- reporter post/clear/rotation events

The backend should make it easy to capture:

- latest operator global view
- affected template view
- affected epoch view
- transaction hash
- decoded event payload
- current block number and timestamp

## Safety Rules

- Reject prepared transactions for root-owned selectors routed through module governance.
- Warn when a requested target is implementation or module address instead of proxy.
- Require explicit environment in every operator request.
- Mark Base Sepolia faucet/test-token actions as testnet-only.
- Mark Base mainnet actions as requiring production governance signoff unless the action is an approved keeper action.
