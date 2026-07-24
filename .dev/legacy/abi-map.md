# RetroPick ABI Map

## Purpose

This file is the shared ABI and deployment registry for `.dev/backend`, `.dev/frontend`, and `.dev/pipeline`.

Source of truth:

- Deployed Base Sepolia addresses: [`../abi/address.md`](../abi/address.md)
- Exported ABI JSON: [`../abi/`](../abi/)
- Contract behavior: [`../currentSmartContract.md`](../currentSmartContract.md)
- Operator procedures: [`../.operator/.runbook.md`](../.operator/.runbook.md)

All off-chain services must treat the MarketEngine **proxy** as the normal entrypoint:

- Base Sepolia proxy: `0x1ed89defc8fbcbd512c562b148868ffdc778018a`
- Base Sepolia implementation: `0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1`
- Chain id: `84532`

The implementation and module addresses are verification/routing metadata, not normal app entrypoints.

## Contract Registry Shape

Every backend, frontend, and pipeline package should consume one generated registry with this shape:

```json
{
  "environment": "base-sepolia",
  "chainId": 84532,
  "explorers": {
    "basescan": "https://sepolia.basescan.org",
    "blockscout": "https://base-sepolia.blockscout.com"
  },
  "contracts": {
    "marketEngineProxy": "0x1ed89defc8fbcbd512c562b148868ffdc778018a",
    "marketEngineImplementation": "0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1",
    "stakeToken": "0xb7f49377af6adbef64f513cf04dbdac9d0af01b1",
    "tokenFaucet": "0xf6c1b6bddd06972f08772de7954432e10c853231",
    "chainlinkAdapter": "0x682b79d6cbd8bcb4e89aeac487ee94e2c306175e",
    "rateAdapter": "0x5b61b033816d710e6da9b659a87fc9c2cef6c145",
    "smartDataAdapter": "0x51905ef42a9c794bce5042d1305ab4582eeb3823",
    "macroAdapter": "0xc2a28f925da7e81d4f66eb006917bdf9a3686f16",
    "equityAdapter": "0x6747e65fa8c81f3e0f472b45a4afba9dbe777bd5",
    "adminModule": "0x98841ad4483403a55d7af7e28899019db5956238",
    "viewModule": "0xec237e5c2821346d3eeb88240dd63e814d42dee9",
    "userOpsClaimsModule": "0xe052d3986d8409119b2c5253ec70e8e164f146da",
    "coreLifecycleModule": "0xbc80925f712c6a362bd612eee0bbec22dd6eedb6",
    "rollingLifecycleModule": "0xe2e7bb0127e74b5761efd7560ba0c950a9d2a8a2"
  },
  "abiFiles": {
    "marketEngine": "abi/IMarketEngine.json",
    "dispatcher": "abi/MarketEngineDispatcher.json",
    "stakeToken": "abi/MockERC20.json",
    "faucet": "abi/TokenFaucet.json"
  }
}
```

## ABI Classification

| ABI | Classification | Primary consumers | Notes |
|---|---|---|---|
| `IMarketEngine.json` | `app-primary` | backend, user frontend, operator frontend | Normalized app ABI for proxy reads and market/user/operator actions. |
| `MarketEngineDispatcher.json` | `operator-primary`, `pipeline-event-source` | backend operator, pipeline, operator frontend | Superset for root-owned admin, UUPS/module registry, and full V2 event set. |
| `MarketEngineViewModule.json` | `reference-only` | backend, operator tooling | Useful for selector/module release verification. Apps still call proxy. |
| `MarketEngineCoreLifecycleModule.json` | `reference-only` | pipeline, keeper, operator tooling | Lifecycle ABI surface for delegated selector verification. Apps still call proxy. |
| `MarketEngineRollingLifecycleModule.json` | `reference-only` | pipeline, keeper, operator tooling | Rolling ABI surface for delegated selector verification. Apps still call proxy. |
| `MarketEngineAdminModule.json` | `reference-only` | operator tooling | Deployed on testnet, but current admin selectors are root-owned on dispatcher. |
| `MarketEngineUserOpsClaimsModule.json` | `reference-only` | frontend/backend reference | Deployed on testnet, but current user/claim selectors are root-owned on dispatcher. |
| `ChainlinkAdapter.json` | `adapter-monitoring` | backend, pipeline | Feed helper calls, owner/config checks, optional direct adapter reads. |
| `RateAdapter.json` | `adapter-monitoring` | backend, pipeline | Same surface as `ChainlinkAdapter`, for `CHAINLINK_RATE`. |
| `SmartDataAdapter.json` | `adapter-monitoring` | backend, pipeline | Same surface as `ChainlinkAdapter`, for `CHAINLINK_SMARTDATA`. |
| `MacroAdapter.json` | `adapter-monitoring` | backend, pipeline | Same surface as `ChainlinkAdapter`, for `CHAINLINK_MACRO`. |
| `EquityAdapter.json` | `adapter-monitoring` | backend, pipeline | Same surface as `ChainlinkAdapter`, for `CHAINLINK_EQUITY`. |
| `TrustedReporterAdapter.json` | `operator-primary`, `pipeline-event-source` | pipeline, operator frontend, reporter service | Reporter post/clear/rotation state and events. Only active when a reporter adapter is deployed/configured. |
| `TokenFaucet.json` | `testnet-utility` | user frontend, backend | Base Sepolia faucet only. Not production. |
| `MockERC20.json` | `testnet-utility`, `user-primary` | user frontend, backend | Base Sepolia stake token reads and approvals. Production uses real stake token ABI. |
| `ERC1967Proxy.json` | `reference-only` | deployment validation | Proxy artifact only; use `IMarketEngine`/`Dispatcher` ABI against proxy address. |

## Consumer Matrix

| Consumer | Required ABIs | Required addresses | Default data source |
|---|---|---|---|
| Backend API | `IMarketEngine`, `MarketEngineDispatcher`, `MockERC20`, `TokenFaucet`, adapters | proxy, stake token, faucet, adapters | PostgreSQL indexed state, with explicit live chain refresh for operators. |
| User frontend | `IMarketEngine`, `MockERC20`, `TokenFaucet` | proxy, stake token, faucet | API/WS for state, wallet for transactions. |
| Operator frontend | `IMarketEngine`, `MarketEngineDispatcher`, `TrustedReporterAdapter` if configured | proxy, implementation, module addresses, reporter adapter | API/WS plus explicit live reads. |
| Indexer pipeline | `MarketEngineDispatcher`, `TrustedReporterAdapter`, `TokenFaucet`, `MockERC20` | proxy, reporter adapter, faucet, stake token | Public RPC `eth_getLogs`. |
| Keeper pipeline | `IMarketEngine`, `MarketEngineDispatcher` | proxy | PostgreSQL schedule plus one live preflight chain read before execution. |
| Reporter pipeline | `TrustedReporterAdapter` | reporter adapter | Off-chain data source plus on-chain post/clear events. |

## Event Indexing Priority

Use `MarketEngineDispatcher.json` as the canonical engine event source because it includes V2 events that are not present in the smaller `IMarketEngine.json`.

**Core market events**

- `TemplateUpserted`
- `MarketInitialized`
- `EpochOpened`
- `EpochLocked`
- `EpochLockedV2`
- `EpochResolved`
- `EpochResolvedV2`
- `EpochCancelled`
- `PositionDeposited`
- `SideSwitched`
- `Claimed`
- `UserEpochIndexed`
- `FeesWithdrawn`

**Rolling and keeper events**

- `RollingGenesisStarted`
- `RollingGenesisLocked`
- `RollingRoundExecuted`
- `RollingHalted`
- `RollingLifecycleReset`

**Yield and recovery events**

- `YieldRouterSet`
- `YieldRouterDepositFailed`
- `YieldRouterWithdrawFailed`
- `YieldRouterFailureRecorded`
- `YieldRouterDisabled`
- `YieldRouterFailureStateReset`
- `YieldEmergencyWithdrawn`
- `EpochYieldAccrued`
- `EpochRoutedPrincipalReconciled`
- `EpochSettledClaimsRouted`
- `EpochSettledClaimPaid`
- `EpochSettledClaimsRecovered`
- `EpochSettledClaimsRoutingDisabled`
- `EmergencyRecoveredBalanceReassigned`
- `EmergencyRecoveredYieldBooked`

**Governance and operator alerts**

- `Upgraded`
- `ModuleCodeHashAllowed`
- `ModuleCodeHashDisallowed`
- `ModuleRegistered`
- `ModuleRevoked`
- `SelectorModuleSet`
- `OracleCursorReset`
- `RateOracleSet`
- `SmartDataOracleSet`
- `MacroOracleSet`
- `EquityOracleSet`
- `TreasuryUpdated`
- `WorkerAuthorityUpdated`
- `DepositExecutorSet`
- `LMRewardsEnabledUpdated`
- `LMRewardReceived`

**Reporter events**

- `TrustedReporterUpdated`
- `ResultPosted`
- `LockSamplePosted`
- `OhlcPosted`
- `ResolveResultCleared`
- `LockSampleCleared`
- `OhlcResultCleared`
- `MaxSignatureAgeUpdated`
- ownership events

**Testnet utility events**

- `TokenFaucet.Minted`
- `MockERC20.Transfer`
- `MockERC20.Approval`

## Public RPC Rule

Follow the final public-RPC optimization in [`.tecStackPublicRPC.md`](./.tecStackPublicRPC.md):

- API reads from PostgreSQL by default.
- Indexer batches `eth_getLogs`.
- Keeper uses no idle chain polling and performs one final chain preflight before sending a transaction.
- Oracle health comes from indexed Chainlink feed events and `oracle_health` rows, not from an idle RPC polling service.
- Paid RPC is not a default dependency.
