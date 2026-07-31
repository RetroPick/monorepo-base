# ADR-013: Phase 1.3 Local Delivery Ordering

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Polymarket provides no authoritative sequence. Clients need ordering guarantees within a RetroPick session.

## Decision

Introduce RetroPick transport metadata:

- `streamEpoch` (uint64): increments on reconnect/resnapshot per token stream
- `deliveryCounter` (uint64): monotonic within a single streamEpoch

Rules:
- Counter gaps → emit `resync.required`
- Epoch change → client discards prior state, awaits snapshot
- No persistent replay buffer
- Reconnecting clients always receive fresh snapshot first

## Consequences

- Extended `RealtimeEnvelope` with new fields
- Frontend state machine tracks epoch/counter
- Not described as Polymarket sequence anywhere
