# RetroPick market_engine v4

Pyth-first implementation pass for the persistent-vault rolling-epoch market engine.

Highlights:
- `lock_epoch` and `resolve_epoch` now consume `Account<PriceUpdateV2>` directly
- template stores Pyth feed IDs as `[u8; 32]`
- explicit `refund_mode` / `claimable` state on `Epoch`
- full-claim-only semantics in v1
- claims/refunds ring-fenced into `ClaimsVault`
- settlement fees moved into `FeeVault`


## v5 additions

- Pyth-first oracle adapter retained from v4
- hardening pass on account relationships and vault-owner checks
- Rust unit tests added under program modules
- TypeScript integration-test scaffolding added under `/tests`
- live posted-Pyth local-validator suites added for lifecycle, stale-oracle, and confidence-width paths
- `TEST_STATUS_V5.md` added with audit-oriented completion status
- single-side mode is now explicitly modeled as `one active outcome per epoch position`
- in single-side mode, `switch_side` is a full-position flip, not a partial rebalance
- see `SINGLE_SIDE_MODE.md` for protocol and frontend guidance
- see `RENT_OPTIMIZATION_V5.md` for the account-layout refactor that reduces epoch and position rent
- see `tests/README.md` for the local Pyth validator bootstrap and oracle test runbook
