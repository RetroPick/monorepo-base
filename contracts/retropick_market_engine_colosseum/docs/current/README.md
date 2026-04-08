# Current protocol documentation

Whitepaper-style reference for the **market_engine** Anchor program in [`programs/market_engine`](../../programs/market_engine).

## Suggested reading order

1. **[currentPrograms.md](./currentPrograms.md)** — Program ID, roles, PDAs, struct summaries, instruction matrix, events, errors pointer, outcome indexing.
2. **[flow.md](./flow.md)** — Epoch lifecycle, oracle checkpoints, token and reserve accounting, economics, resolvers, operational checklist.
3. **[rollin-rounds.md](./rollin-rounds.md)** — `MarketLedger` counters, when `open_epoch` is valid, overlap between new rounds and prior claims, operator checklist.

## File index

| Document | Focus |
|----------|--------|
| [currentPrograms.md](./currentPrograms.md) | On-chain API and account model |
| [flow.md](./flow.md) | Mechanism design, formulas, state machine |
| [rollin-rounds.md](./rollin-rounds.md) | Sequential epochs and ledger sequencing |

## Testing and verification

- Crate tests and math/regression coverage: [`programs/market_engine/tests/invariant_regressions.rs`](../../programs/market_engine/tests/invariant_regressions.rs), plus unit tests under `programs/market_engine/src/**`.
- From the workspace root, run `cargo test -p market_engine` (or the repo’s `Anchor.toml` script under `[scripts]` if you use the full workspace harness).

## Source of truth

On-chain behavior is defined only by the Rust sources under [`programs/market_engine/src`](../../programs/market_engine/src). If docs and code disagree, **trust the code** and file a doc fix.
