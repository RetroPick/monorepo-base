# Indexer sync loop (`SyncOnce`)

This is a code walkthrough of the indexer sync algorithm implemented in `apps/backend/internal/indexer/indexer.go` and driven by `cmd/indexer/main.go`.

## Outer driver loop (`cmd/indexer/main.go`)

Key responsibilities:

- loads config + embedded registry
- waits for schema
- opens a DB pool
- creates a failover RPC client
- constructs `indexer.Service`
- calls `SyncOnce` on a fixed ticker interval
- exposes optional metrics if `METRICS_PORT` is set

## `SyncOnce` control flow

```mermaid
flowchart TD
  loadState[GetIndexerState] --> head[RPC BlockNumber]
  head --> stable[stableHead=head-finalityDepth]
  stable --> cont{continuity?}
  cont -->|ok| range[compute from..to]
  cont -->|mismatch| reorg[rewind+truncate+incident]
  range --> logs[FilterLogs proxy in range]
  logs --> txBegin[Begin tx]
  txBegin --> handle[handleLog for each log]
  handle --> updateState[UpdateIndexerState(to, hash)]
  updateState --> maybeTickEvent[Insert realtime indexer_tick]
  maybeTickEvent --> commit[Commit tx]
  commit --> notify[Notify seqs via pg_notify]
```

## Range selection

Inputs:

- `indexer_state.last_block` (persisted)
- `INDEXER_FINALITY_DEPTH` (default 3)
- `INDEXER_MAX_BLOCKS_PER_TICK` (driver clamps to <= 10k)

Behavior:

- stable head is computed as `head - finalityDepth`
- `from = last_block + 1`
- if last_block is 0:\n  - bootstrap lookback is applied (`INDEXER_LOOKBACK_BLOCKS`, default 50k)\n  - from is set to `head - lookback` (or 1)
- `to = min(from + maxBlocks - 1, stableHead)`

If `from > stableHead`, the indexer returns early (nothing stable to index yet).

## Transaction boundaries

The indexer writes most state within one SQL transaction:

- inserts `chain_events`\n- updates templates/epochs/projections\n- inserts `realtime_events`\n- updates `indexer_state`

After commit, it calls `realtime.Notify` for each inserted realtime seq, which does `pg_notify('realtime_event', seq)`.

## “Tick summary” realtime event

If logs were indexed, `SyncOnce` inserts a `realtime_events` envelope:\n\n- channel: `global:markets`\n- type: `indexer_tick`\n- dedupe key: `tick:<from>:<to>`

This makes it possible for frontends to observe overall liveness even if no per-market events are emitted.

## Failure modes

Common errors returned:\n\n- RPC errors (block number, filter logs, header fetch)\n- DB errors\n- reorg detected (returns an error after rewinding)\n\nThe driver logs errors and continues on next tick.

## Source pointers

- `apps/backend/cmd/indexer/main.go`\n- `apps/backend/internal/indexer/indexer.go`

