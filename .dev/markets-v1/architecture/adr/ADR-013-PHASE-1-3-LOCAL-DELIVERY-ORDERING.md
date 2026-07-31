# ADR-013: Phase 1.3 Local Delivery Ordering

**Status:** Accepted
**Implementation:** Done (DeliveryTracker + envelope fields); fe-v1 integration pending P13C-004
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
- Frontend state machine tracks epoch/counter (`apps/fe-v1`)
- Not described as Polymarket sequence anywhere

## Implementation status (2026-07-31)

| Deliverable | Path | Status |
|-------------|------|--------|
| DeliveryTracker | `apps/backend/internal/markets/realtime/` | done |
| OpenAPI envelope fields | `schemas/openapi/markets-v1.yaml` | done |
| fe-v1 state machine | `apps/fe-v1/src/features/markets/hooks/useMarketsRealtime.ts` | partial — capability off |
| Honest capability gating | P13C-004 | pending |
