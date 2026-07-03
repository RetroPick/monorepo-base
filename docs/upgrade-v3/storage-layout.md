# Storage layout CI

Upgrade-sensitive contracts must keep a stable storage layout. CI compares `forge inspect … storage-layout` output against committed baselines in `package/prediction-v2/.storage-layout/`.

## Tracked contracts

| Contract | Path | Notes |
|----------|------|-------|
| `MarketEngineDispatcher` | `src/engine/MarketEngineDispatcher.sol` | UUPS proxy storage owner |
| `MarketEngineAdminModule` | `src/engine/modules/MarketEngineAdminModule.sol` | Delegatecall module; must match dispatcher layout |
| `MarketEngineViewModule` | `src/engine/modules/MarketEngineViewModule.sol` | Delegatecall module |
| `FeeRouter` | `src/treasury/FeeRouter.sol` | Treasury routing (V3) |

## Local commands

```bash
cd package/prediction-v2
./script/check-storage-layout.sh
```

Refresh baselines after an intentional, reviewed layout change:

```bash
UPDATE_STORAGE_LAYOUT=1 ./script/check-storage-layout.sh
git add .storage-layout/
```

## CI

`.github/workflows/contracts.yml` runs the check after `forge build`. Any drift fails the job with a unified diff.

## Review checklist

1. Confirm slot order and `__gap` preservation in `MarketEngineState` / shared storage.
2. Run full `forge test -j1` and treasury match-path tests.
3. Document the layout change in `DECISIONS.md` if it affects upgrade paths.
