# ADR-012: Phase 1.3 Order-Book Reconciliation

**Status:** Accepted
**Implementation:** Done (reconciler + unit tests); integration closure pending P13C-005
**Date:** 2026-07-31

## Context

Polymarket `price_change.hash` is per-change evidence, not a documented hash-chain link. Applying hash-chain delta semantics risks silent corruption.

## Decision

Use **snapshot-first safe mode**:

1. Full `book` events replace local state.
2. `price_change` applies absolute level replacement (size zero removes level).
3. Hash values stored as upstream evidence only — never as chain validation.
4. Periodic REST `/book` revalidation; resnapshot on mismatch.
5. Reconnect increments `streamEpoch` and requires fresh snapshot before deltas.
6. `sequence` remains null on all public envelopes.

## Evidence

Compatibility spike and official docs show `price_change` as `{price, size, side}` per token without `baseHash`/`nextHash` chain semantics.

## Consequences

- `marketdata.Reconciler` state machine replaces hash-chain `ApplyDelta` for realtime path
- Legacy `State.ApplyDelta` retained for unit tests documenting hash-gap behavior
- Clients must handle `resync.required` on epoch change

## Implementation status (2026-07-31)

| Deliverable | Path | Status |
|-------------|------|--------|
| Reconciler state machine | `apps/backend/internal/markets/marketdata/reconciler.go` | done |
| Unit tests | `reconciler_test.go` | done |
| REST revalidation under load | P13C-005 | pending |

Hash values are stored as upstream evidence only — never used for chain validation in the realtime path.
