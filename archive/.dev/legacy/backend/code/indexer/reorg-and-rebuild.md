# Indexer reorg handling and rebuild behavior

This doc focuses on the continuity check + reorg rewind behavior in `apps/backend/internal/indexer/indexer.go`.

## Continuity check

When `indexer_state.last_block_hash` is set, the indexer does:

- `HeaderByNumber(last_block)`
- compare `header.Hash()` to stored hash

If they mismatch, the indexer assumes a chain reorg or data inconsistency and triggers a recovery path.

## Reorg recovery transaction

```mermaid
flowchart TD
  mismatch[hash mismatch] --> chooseRewind[rewindDepth=64 blocks]
  chooseRewind --> beginTx[Begin tx]
  beginTx --> deleteEvents[DELETE chain_events > rewindTo]
  deleteEvents --> truncate[TRUNCATE projection tables]
  truncate --> cancelJobs[Mark keeper jobs failed + clear claim]
  cancelJobs --> incident[INSERT incident high severity]
  incident --> updateState[UPDATE indexer_state to rewindTo and clear hash]
  updateState --> commit[Commit tx]
  commit --> returnErr[Return error \"reorg detected\"]
```

### Rewind depth

- fixed at 64 blocks (`rewindDepth := int64(64)`)
- `rewindTo = last_block - 64` clamped to `>= 0`

### Canonical event log behavior

It deletes canonical events after the rewind point:

- `DELETE FROM chain_events WHERE block_number > rewindTo`

This is a deliberate choice: `chain_events` is treated as canonical but not immutable under reorgs.\n\nIt favors deterministic rebuild over keeping potentially invalid events around.

### Projection reset behavior

It truncates the following projection tables:

- `market_epoch_outcomes`
- `market_snapshots`
- `market_read_models`
- `probability_points`
- `user_position_outcomes`

This forces projection rebuild as new logs are processed again.

### Keeper job safety

It also cancels in-flight keeper jobs:

- updates `keeper_schedule` where status in `('pending','claimed')` to `failed`\n- clears claim fields\n- sets `last_error` to a “reorg rewind” message

The intent is to prevent executing keeper actions derived from potentially invalid or rewound state.

### Incident insertion

It inserts a high-severity incident row with payload:\n\n- `rewindTo`\n- `previousLastBlock`

This is the operator-visible audit trail of the rewind.

## What happens next

After the transaction commits, the indexer returns an error.\n\nOn the next tick, it resumes from the rewound `indexer_state.last_block` and replays logs forward, recreating projections.

## Operational implications

- Frequent reorg rewinds will churn projections and can make UIs appear unstable.\n- If rewinds occur repeatedly without the indexer catching up, suspect RPC instability or wrong chain RPC.\n- Watch `incidents` and `indexer_state.reorg_depth`.

## Source pointers

- `apps/backend/internal/indexer/indexer.go` (continuity + rewind logic)

