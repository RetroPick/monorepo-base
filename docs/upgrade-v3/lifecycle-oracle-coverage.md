# Lifecycle and oracle coverage (Sprint 2)

Production settlement correctness depends on epoch gates and oracle reads. This matrix maps P0 behaviors to Foundry tests.

## P0 behavior matrix

| Behavior | Covered | Test file |
|----------|---------|-----------|
| Deposit after lock | Yes | `test/engine/security/MarketEngineProductionLifecycle.t.sol` |
| Claim before resolve | Yes | `MarketEngineProductionLifecycle.t.sol` |
| Double resolve | Yes | `MarketEngineProductionLifecycle.t.sol` (`TooEarlyToResolve` after epoch leaves Locked) |
| `withdrawFees` CEI / reentrancy | Yes | `test/engine/security/MarketEngineAdminSecurity.t.sol` |
| ME + FeeRouter integration | Yes | `test/integration/MarketEngineFeeRouter.t.sol` |
| Cancel epoch refund path | Partial | `MarketEngineLifecycleSecurity.t.sol` |
| Stale oracle / rolling halt | Partial | `test/engine/rolling/MarketEngineRollingOracle.t.sol` |
| Direction / Threshold / Range resolvers | Partial | `test/engine/core/MarketEngineManualTypes.t.sol` |
| Trusted reporter parity | Partial | `test/engine/security/MarketEngineOracleParity.t.sol` |

## Gaps (P1 / follow-up)

- Cancelled market full refund E2E with yield router
- Tie/void explicit refund assertions per market type
- Corridor / Cascade resolver edge-case matrix (add targeted tests when those types go live on staging)

## Verification

```bash
cd package/prediction-v2
FOUNDRY_PROFILE=ci forge test -j1 --match-contract MarketEngineProductionLifecycleTest -vv
FOUNDRY_PROFILE=ci forge test -j1 --match-path test/integration/*FeeRouter*
```
