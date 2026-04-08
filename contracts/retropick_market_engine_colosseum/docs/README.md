# RetroPick `market_engine` — documentation hub

This folder is the **curriculum and deep reference** for the Anchor program in [`programs/market_engine/`](../programs/market_engine/). Root-level specs (audits, rent notes, build plans) stay at the repository root; this hub links them and orders reading for new contributors and integrators.

## Maintenance rule

When you change on-chain behavior or account layouts under `programs/market_engine/src/`, update:

1. The row for that module in [12-implementation-traceability-matrix.md](12-implementation-traceability-matrix.md).
2. The numbered doc section cited in that row (instructions, math, oracle, etc.).

## Suggested reading order

| Step | Document | Why read it |
|------|----------|-------------|
| 0 | [00-glossary-and-conventions.md](00-glossary-and-conventions.md) | Shared vocabulary: e8, BPS, bitmask winners, roles, void vs cancel. |
| 1 | [ProgramExplanation.md](ProgramExplanation.md) | One continuous story: bootstrap → epoch → claim (links into the rest). |
| 2 | [01-architecture-overview.md](01-architecture-overview.md) | Trust boundaries, token flow, who signs what. |
| 3 | [02-account-model-and-pdas.md](02-account-model-and-pdas.md) | PDAs, seeds, account sizes, vault layout. |
| 4 | [03-epoch-lifecycle-and-state-machine.md](03-epoch-lifecycle-and-state-machine.md) | Statuses, timing, sequence diagrams. |
| 5 | [04-instructions-reference.md](04-instructions-reference.md) | Every program entrypoint: accounts, checks, events. |
| 6 | [05-oracle-and-checkpoints.md](05-oracle-and-checkpoints.md) | Pyth, staleness, confidence, checkpoint A vs B. |
| 7 | [06-resolvers-and-market-types.md](06-resolvers-and-market-types.md) | Direction, threshold, range-close semantics. |
| 8 | [07-math-settlement-and-ledger.md](07-math-settlement-and-ledger.md) | Fees, pro-rata claims, ledger reserves, dust sweep. |
| 9 | [08-positions-single-side-and-switching.md](08-positions-single-side-and-switching.md) | Position rules, switch fee rounding, partial switches. |
| 10 | [09-events-errors-and-observability.md](09-events-errors-and-observability.md) | Indexers, support playbooks. |
| 11 | [10-client-integration-guide.md](10-client-integration-guide.md) | PDAs, bundles, testing pointers. |
| 12 | [11-testing-and-invariants.md](11-testing-and-invariants.md) | Invariant tests as protocol laws. |
| 13 | [12-implementation-traceability-matrix.md](12-implementation-traceability-matrix.md) | Source ↔ doc map (audit trail). |

## Prerequisites

- Solana account model and PDAs.
- Anchor basics (`#[program]`, `Context`, `#[account]` constraints).
- SPL Token (or token-2022 via interface) transfers.

## Repository root references

| Topic | Location |
|--------|----------|
| Project overview | [../README.md](../README.md) |
| Build / roadmap | [../BUILD_PLAN.md](../BUILD_PLAN.md), [../BUILD_PLAN_V4.md](../BUILD_PLAN_V4.md) |
| Audits | [../AUDIT.md](../AUDIT.md), [../AUDIT_V4_SUMMARY.md](../AUDIT_V4_SUMMARY.md) |
| Single-side mode | [../SINGLE_SIDE_MODE.md](../SINGLE_SIDE_MODE.md) |
| Rent / account layout | [../RENT_OPTIMIZATION_V5.md](../RENT_OPTIMIZATION_V5.md) |
| Test status | [../TEST_STATUS_V5.md](../TEST_STATUS_V5.md) |
| TS integration tests | [../tests/README.md](../tests/README.md) |
| Rust program tests | [../programs/market_engine/tests/README.md](../programs/market_engine/tests/README.md) |

## Program entry

- Crate: `programs/market_engine/`
- Program ID for localnet in [../Anchor.toml](../Anchor.toml) (verify for your cluster; production IDs belong in deployment docs, not hardcoded here as truth).

## Document conventions

- **Code paths** are relative to the repo root unless stated otherwise.
- **Epoch snapshot** means fields copied from `MarketTemplate` into `Epoch` at `open_epoch`; resolution and user rules use the epoch copy, not the live template.
- **e8** means fixed-point scaling with \(10^8\) (see glossary).
