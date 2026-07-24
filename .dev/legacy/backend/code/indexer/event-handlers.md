# Indexer event handlers (log → projections)

This doc explains what happens inside `Service.handleLog(...)` in `apps/backend/internal/indexer/indexer.go`: how each decoded event produces DB writes, projection updates, keeper scheduling, and realtime envelopes.

## Handler structure

At a high level:

1. Determine event ABI by topic0.\n2. Decode payload for user-facing events (`PositionDeposited`, `SideSwitched`, `Claimed`).\n3. Derive `template_id` and `epoch_id` from topics.\n4. Insert `chain_events` (idempotent).\n5. If inserted (not a duplicate), run event-specific handler.\n6. Event handlers update projections and emit realtime envelopes.

```mermaid
flowchart TD
  logIn[types.Log] --> abiLookup[ABI EventByID(topic0)]
  abiLookup --> payload[Decode payload if user event]
  payload --> insertEvent[Insert chain_events ON CONFLICT DO NOTHING]
  insertEvent -->|duplicate| stop[return]
  insertEvent -->|inserted| dispatch[switch ev.Name]
  dispatch --> proj[projection writes + recompute]
  proj --> realtime[Insert realtime_events envelopes]
  realtime --> schedule[Schedule keeper jobs (some events)]
```

## Canonical persistence: `chain_events`

All logs get persisted into `chain_events` with:

- block number\n- tx hash\n- log index\n- contract address\n- event name\n- template id (bytes)\n- epoch id (bigint)\n- optional user address\n- payload JSONB

Uniqueness is enforced by `(tx_hash, log_index)` so replays are safe.

## Template / market lifecycle events

### `TemplateUpserted`

- updates `templates` row via `UpsertTemplateFromUpsert`:\n  - slug\n  - market type\n  - outcome count\n  - oracle max delay seconds\n  - oracle max confidence bps

### `MarketInitialized`

- ensures a ledger row exists (`UpsertLedgerRow`)\n- marks template initialized (`SetTemplateInitialized`)

### `EpochOpened`

Key writes:

- upsert epoch with open/lock/resolve timestamps\n- set ledger `active_epoch_id`\n- initialize projection tables:\n  - `market_snapshots` row reset for this epoch\n  - `market_epoch_outcomes` rows set to zero\n  - `recomputeProjection` sets initial probabilities/multipliers\n- schedule next lifecycle action (keeper)\n- emit realtime envelopes:\n  - `global:markets`\n  - `market:<templateId>`\n  - `epoch:<templateId>:<epochId>`

### `EpochLocked` / `EpochLockedV2`

- mark epoch locked (lock tx hash)\n- update snapshot status to `locked`\n- schedule manual resolve (for manual templates)\n- emit `epoch_locked` realtime envelopes

### `EpochResolved` / `EpochResolvedV2`

`EpochResolved`:\n\n- persists winning outcome mask and `ref_mode` flag\n- sets ledger `last_resolved_epoch_id`\n- updates snapshot status to `resolved`\n- emits `epoch_resolved` realtime envelopes

`EpochResolvedV2`:\n\n- checkpoint-only update (no winning mask)\n- same ledger + snapshot + realtime updates

### Rolling events

Rolling lifecycle handlers update rolling phase and schedule rolling actions:

- `RollingGenesisStarted`\n  - sets `templates.rolling_phase = 1`\n  - schedules `keeper.ActionGenesisLockRolling`
- `RollingGenesisLocked`\n  - sets `templates.rolling_phase = 2`\n  - schedules `keeper.ActionExecuteRollingRound`
- `RollingRoundExecuted`\n  - schedules `keeper.ActionExecuteRollingRound` again (next cycle)
- `RollingHalted`\n  - updates rolling halt reason fields on `templates`/ledger

These handlers are the bridge between on-chain rolling lifecycle events and off-chain automation schedule.

## User action events (pool + position projections)

### `PositionDeposited`

Effects (when payload decoding succeeds):

- increment the pool amount for `market_epoch_outcomes` at `outcome_index`\n- increment `market_snapshots.volume` by the deposited amount\n- recompute implied probabilities/multipliers (`recomputeProjection`)\n- upsert user position outcome row (`user_position_outcomes`) for the user\n- emit:\n  - `pool_update` to public channels\n  - `position_update` to `user:<wallet>`

### `SideSwitched`

Effects:

- decrement `fromOutcome` pool by `grossAmount` (clamped to >= 0)\n- increment `toOutcome` pool by `netAmount`\n- increment `market_snapshots.volume` by `grossAmount`\n- recompute probabilities/multipliers\n- update user position outcomes (negative delta on from, positive on to)\n- emit `pool_update` + user `position_update`

### `Claimed`

Effects:

- marks all user outcome rows for that epoch as claimed\n- stores `claimed_amount` when available\n- emits:\n  - `claim_update` to public channels\n  - `claim_confirmed` to `user:<wallet>`

## Projection recomputation and probability points

When pools change, `recomputeProjection`:\n\n- loads current pools\n- computes:\n  - `probability_bps` (pool / total * 10_000)\n  - `multiplier_bps` (total / pool * 10_000)\n- updates `market_epoch_outcomes` rows\n- may append a `probability_points` snapshot if probabilities changed\n- upserts `market_snapshots` and `market_read_models` (materialized JSON outcomes + metadata)

Probability points are grouped by a monotonic `seq` computed as `MAX(seq)+1` for the table.\n\nEach `seq` inserts one row per outcome so the chart can replay a full multi-outcome state at each point.

## Realtime envelopes emitted by indexer

For market/epoch-level changes, `emitProjectionEvent` inserts realtime envelopes to:\n\n- `global:markets`\n- `market:<templateId>`\n- `epoch:<templateId>:<epochId>`

For user changes:\n\n- `user:<wallet>`

Each insertion uses a dedupe key that includes tx hash, log index, and channel to be idempotent under replays.

## Source pointers

- `apps/backend/internal/indexer/indexer.go`
- `apps/backend/internal/realtime/realtime.go`
- `apps/backend/internal/keeper/*` (actions and schedule model)

