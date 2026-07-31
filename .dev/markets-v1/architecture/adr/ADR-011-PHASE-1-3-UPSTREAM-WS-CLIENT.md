# ADR-011: Phase 1.3 Upstream WebSocket Client

**Status:** Accepted
**Implementation:** Done (supervisor + tests); runtime closure pending P13C-003 E2E evidence
**Date:** 2026-07-31

## Context

Phase 1.3 requires a production-grade supervisor for Polymarket's public market WebSocket at `wss://ws-subscriptions-clob.polymarket.com/ws/market`.

## Decision

Implement a bounded Go supervisor in `internal/markets/upstream/ws` with:

- Exponential reconnect backoff with jitter
- PING/PONG heartbeat (10s client interval)
- Connection sharding (max assets per connection)
- Dynamic subscribe/unsubscribe via subscription planner
- Malformed frame isolation (never kill all streams)
- Sanitized logging (no credential material)

Parse raw snake_case wire format (`event_type`, `asset_id`) per official AsyncAPI.

## Consequences

- Single process owns upstream connections
- Coverage metrics expose subscribed/eligible ratio honestly
- Optional SDK topic/payload format not required for Phase 1.3

## Implementation status (2026-07-31)

| Deliverable | Path | Status |
|-------------|------|--------|
| Supervisor | `apps/backend/internal/markets/upstream/ws/supervisor.go` | done |
| Planner | `apps/backend/internal/markets/upstream/ws/planner.go` | done |
| Fake server | `apps/backend/internal/markets/upstream/ws/fake_server.go` | done |
| E2E through hub | P13C-003 | pending |

Phase 1.3 is **not complete** until P13C-003 proves upstream → hub path under reconnect.
