# Indexer

The indexer is the process that turns on-chain logs into the relational read models the frontend consumes.

- Entrypoint: `apps/backend/cmd/indexer/main.go`
- Core: `apps/backend/internal/indexer/indexer.go`

## High-level loop

`cmd/indexer/main.go` runs a ticker loop:

- Waits for schema (`db.WaitForSchema`)
- Opens DB pool
- Creates a failover RPC client (`ethops.NewFailoverRPCClient`)
- Every tick, calls `svc.SyncOnce(ctx, maxBlocksPerTick)`

## `SyncOnce` algorithm (as implemented)

```mermaid
flowchart TD
  loadState[Load indexer_state] --> getHead[Read chain head]
  getHead --> stableHead[Compute stableHead=head-finalityDepth]
  stableHead --> continuityCheck{Continuity check}
  continuityCheck -->|ok| computeRange[Compute from..to]
  continuityCheck -->|mismatch| rewind[Reorg: rewind+truncate+incident]
  computeRange --> filterLogs[eth_getLogs proxy from..to]
  filterLogs --> handleLogs[Handle each log: insert chain_events, update projections]
  handleLogs --> updateState[Update indexer_state(last_block, last_block_hash)]
  updateState --> insertTickEvent[Insert realtime indexer_tick]
  insertTickEvent --> commit[Commit DB tx]
  commit --> notify[pg_notify realtime_event(seq) for inserted envelopes]
```

### Finality depth

Stable range is computed as:

- `stableHead = head - finalityDepth`
- `finalityDepth` default: `3`
  - It is read from `INDEXER_FINALITY_DEPTH` in config, and also re-read from env inside `SyncOnce` (so env overrides are effective even if config is stale).

### Initial bootstrap lookback

If `indexer_state.last_block == 0`, the indexer sets `from` to `head - lookback` (default lookback is `50000`, configurable via `INDEXER_LOOKBACK_BLOCKS`).

### Log span cap (public RPC)

`cmd/indexer/main.go` clamps `INDEXER_MAX_BLOCKS_PER_TICK` to **<= 10000**, matching the common Base public RPC `eth_getLogs` span cap.

### Continuity + reorg handling

If `indexer_state.last_block_hash` is set, the indexer loads the header at `last_block` and compares its hash with the stored hash.

On mismatch (reorg detected), it performs a recovery transaction:

- Deletes `chain_events` where `block_number > rewindTo`
- Truncates projection tables: `market_epoch_outcomes`, `market_snapshots`, `market_read_models`, `probability_points`, `user_position_outcomes`
- Marks any pending/claimed keeper jobs as failed, clears claim state
- Inserts an `incidents` row (“indexer reorg rewind”) with severity `high`
- Updates `indexer_state` to `rewindTo` and clears `last_block_hash`

Then it returns an error so the loop logs it; next tick resumes from the rewound point.

## What the indexer writes

- **Canonical**:
  - `chain_events` (idempotent insert with `ON CONFLICT (tx_hash, log_index) DO NOTHING`)
- **Derived/projections** (examples; see schema docs):
  - templates/ledgers/epochs updates for lifecycle events
  - pool/probability/multiplier computation in `market_epoch_outcomes` and `market_snapshots`
  - `market_read_models` materialization for API reads
  - `probability_points` time series points for charting
  - user outcome stakes in `user_position_outcomes`
- **Realtime**:
  - Inserts envelopes into `realtime_events` (dedupe keys per channel/event)
  - Calls `realtime.Notify(ctx, pool, seq)` after commit to wake listeners

## Relationship to keeper scheduling

The indexer schedules keeper jobs when epochs open/lock/resolve or rolling phases advance. The schedule rows live in `keeper_schedule` and are claimed by the keeper service.

Scheduling helpers are invoked during event handling (e.g. `onEpochOpened`, `onEpochLocked`, rolling handlers).

## Operational signals

- API `/api/v1/health` reads `indexer_state` (last indexed block, hash, last sync time).
- `incidents` will show reorg rewinds.
- `cmd/indexer/main.go` exposes optional metrics if `METRICS_PORT` is set:
  - `retropick_indexer_successful_ticks_total`
  - `retropick_indexer_failed_ticks_total`

