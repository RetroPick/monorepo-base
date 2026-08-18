# Technical Debt

## Current

- Frontend still imports some product-domain helpers from app-local files.
- `apps/backend` is Markets-only; further service splits should wait until CI and staging are stable.
- Canonical epoch contracts live under `archive/contracts/legacy-pool-v1/` (not a live deploy path).
- Legacy docs and generated repo snapshots continue to consolidate under `archive/docs/`.

## Deferred

- Quarantine global Header `WalletButton` on markets routes (MKT-P2-001) before trading UX.
- Epoch operator console is archived under `archive/apps/ops-web/` (see ADR-R4).
- PRISM implementation (`contracts/prism/`, `packages/prism/`) — future product line.
- Adopt shared packages throughout app code with tests per slice.
