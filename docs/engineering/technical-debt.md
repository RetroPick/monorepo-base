# Technical Debt

## Current

- Frontend still imports some product-domain helpers from app-local files.
- `apps/backend` has multiple service responsibilities by design; future split should happen after CI/process supervision is stable.
- Contract project remains physically in `package/prediction-v2` with `package/prediction-v2` as canonical symlink.
- Legacy docs and generated repo snapshots are being archived incrementally.

## Deferred

- Move `apps/fe-v1` to `apps/web`.
- Move `apps/ops` to `apps/admin`.
- Move contracts to `contracts/evm` after submodule health is proven.
- Adopt shared packages throughout app code with tests per slice.
