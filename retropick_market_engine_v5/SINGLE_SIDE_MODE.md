# Single-Side Mode

This note defines the intended behavior of `allow_multi_side_positions` in `retropick_market_engine_v5`.

## Executive Summary

When `allow_multi_side_positions = false`, a user position is intentionally restricted to one active outcome at a time for a given epoch.

That means:

- `deposit_to_side` may only add stake to the currently active outcome
- depositing to the opposite outcome is rejected
- `switch_side` is treated as a full-position flip
- partial switches are rejected

This is not a portfolio or hedging mode. It is a simplified "pick one side, optionally flip before lock" mode.

## User Flow

Assume a binary market with outcomes `YES` and `NO`.

### Allowed

1. User deposits `100` on `YES`
2. User deposits `25` more on `YES`
3. User flips the full `YES` position to `NO`
4. After a 2% switch fee, the resulting position becomes `NO=122.5` equivalent in token base units

### Rejected

1. User deposits `100` on `YES`
2. User tries to deposit `10` on `NO`
3. Rejected because that would create a split position

### Rejected

1. User deposits `100` on `YES`
2. User tries to switch only `40` to `NO`
3. Rejected because that is a partial rebalance, not a full flip

## Contract Semantics

Single-side mode is enforced onchain in two places:

- `deposit_to_side` rejects deposits that would create stake on multiple outcomes
- `switch_side` requires:
  - the source side is the only nonzero side
  - the switch amount equals the entire source-side stake

This keeps the contract rule simple and deterministic.

## Why This Shape

The prior behavior allowed the frontend to think in terms of "switch any amount", but in single-side markets that creates an ambiguous user experience:

- partial switching looks like rebalancing
- rebalancing contradicts one-side-only semantics
- users hit confusing failures unless the UI understands the exact rule

The re-architected rule is:

> single-side mode supports add-to-position and full flip, but not partial hedging or partial rotation

That is a cleaner protocol contract and a clearer frontend contract.

## Frontend Guidance

If `allow_multi_side_positions = false`, the UI should:

- show one active side per user position
- disable deposits to the opposite side while stake exists
- label switching as `Flip Position` or `Flip Side`
- default the switch amount to the full source-side balance
- not expose partial switch input unless it is hard-disabled
- show the switch fee and post-fee destination amount before submit

If `allow_multi_side_positions = true`, the UI may expose normal multi-outcome deposit and partial switch flows.

## Recommended Product Mapping

Use `allow_multi_side_positions = false` for:

- simple direction markets
- threshold markets aimed at retail UX
- markets where "one opinion at a time" is desirable

Use `allow_multi_side_positions = true` for:

- advanced trader flows
- hedging or laddered exposure
- any interface that wants partial side rotation

## Invariants

When `allow_multi_side_positions = false`:

- a position should have at most one nonzero outcome after every successful instruction
- `deposit_to_side` cannot create a second nonzero outcome
- `switch_side` cannot leave stake on both source and destination outcomes

## Testing Targets

The Rust regression suite should cover:

- first deposit is allowed
- same-side top-up is allowed
- opposite-side deposit is rejected
- full flip is allowed
- partial flip is rejected
- invalid split positions are detected by helper logic
