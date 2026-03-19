# Rent Optimization Notes

This refactor keeps protocol behavior unchanged and reduces rent on the hot account types by removing state that was already implied by PDA seeds.

## What Changed

- `Epoch` no longer stores `ledger` and `template` pubkeys.
- `Position` no longer stores `epoch` and `user` pubkeys.
- `Position` no longer stores unused `created_at` and `updated_at` timestamps.
- `MarketLedger` no longer stores `template`.
- `MarketTemplate` no longer stores a redundant `config` pubkey.
- Reserve buffers were tightened on the hot accounts.
- Instruction constraints now rely on PDA derivation instead of duplicated stored parent keys.

## Why It Is Safe

- `Epoch` is derived from `[b"epoch", template, epoch_id]`.
- `Position` is derived from `[b"position", epoch, user]`.
- `MarketLedger` is derived from `[b"ledger", template]`.
- `MarketTemplate` is derived from `[b"template", slug]`, while `Config` is a singleton PDA at `[b"config"]`.

Those relationships were already enforced by account seeds. The removed pubkeys were redundant copies, not independent sources of truth.

## Size Impact

- `Epoch::INIT_SPACE`: `550 -> 438` bytes
- `Position`: legacy layout `211` bytes, reduced once by parent-key removal and reduced again by dropping unused timestamps
- `MarketLedger`: legacy layout `146` bytes, new layout `82` bytes
- `MarketTemplate::INIT_SPACE`: `304 -> 272` bytes

Direct effect:

- opening a new epoch is cheaper because each epoch account is smaller
- each new user position is cheaper because each position account is smaller
- each market initialization is slightly cheaper because the ledger account is smaller
- each template upsert is slightly cheaper because the template account is smaller

## Files

- `programs/market_engine/src/state/epoch.rs`
- `programs/market_engine/src/state/position.rs`
- `programs/market_engine/src/state/ledger.rs`
- `programs/market_engine/src/instructions/market/*.rs`
- `tests/helpers/marketEngine.ts`

## Verification

- `cargo test --manifest-path programs/market_engine/Cargo.toml`
- `anchor build`
  - still ends with the existing local Anchor post-build `os error 2`, but the updated `target/deploy/market_engine.so` is produced
- `pnpm test:single-side` against a fresh local validator after deploying the rebuilt `.so`
  - the TS harness was updated to match the current `initialize_config` ABI, including the `OracleKind` enum byte
