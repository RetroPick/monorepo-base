# Test and audit status for v5

## What was added in v5

- stronger account relationship checks across `template`, `ledger`, `epoch`, `position`, and vault metadata
- stronger vault token owner/mint checks in cancel/claim/resolve/withdraw flows
- monotonic epoch opening guard in `open_epoch`
- Rust unit tests for math/resolver modules
- TypeScript integration-test scaffolding for Pyth worker flows
- explicit single-side mode semantics: same-side top-up + full-position flip only
- Rust regression coverage for single-side mode and epoch snapshot/oracle boundary hardening
- local-validator integration test for single-side mode under `tests/single_side_mode.ts`
- raw TS instruction encoders updated to match the current compact config/template layouts
- live posted-Pyth helper wired to Hermes + Pyth Solana Receiver via `tests/helpers/pyth.ts`
- live local-validator Pyth lifecycle and negative suites under:
  - `tests/market_lifecycle.cjs`
  - `tests/pyth_stale_flow.cjs`
  - `tests/pyth_confidence_flow.cjs`
- bootstrap helper now reuses the singleton config mint on validator reruns instead of minting a fresh incompatible token
- package scripts added for the live oracle suites

## What is verified now

- `cargo test --manifest-path programs/market_engine/Cargo.toml` passes in this workspace
- `pnpm test:single-side` passes against a locally started validator after deploying `market_engine.so`
- `pnpm test:market-lifecycle` passes against a validator with cloned Pyth receiver dependencies
- `pnpm test:pyth-stale` passes against a fresh validator with cloned Pyth receiver dependencies
- `pnpm test:pyth-confidence` passes against a fresh validator with cloned Pyth receiver dependencies
- Rust unit tests cover math, resolvers, epoch timing helpers, and position mode helpers
- Rust invariant regression tests cover:
  - epoch activity guards
  - switch-fee reserve accounting
  - epoch snapshot payout math
  - oracle publish-time boundary checks
  - single-side mode helper behavior
- local-validator integration test covers:
  - same-side top-up
  - full-position flip
  - opposite-side deposit rejection
  - partial-switch rejection
  - template-deactivation rejection on switch

## What is still not verified in-container

- only the documented BTC/USD + active guardian-set local bootstrap path is exercised live here
- most older `.ts` oracle scaffolds remain superseded by the runnable `.cjs` suites rather than fully rewritten

## Highest-risk remaining items

1. wrong-feed and publish-time-boundary live Pyth negative tests
2. stack-pressure review for the largest account contexts
3. invariant/fuzz testing for reserve accounting
4. reducing the local harness dependence on current Node/package-resolution quirks
