# ADR-014: Phase 1.3 Observation Persistence

**Status:** Accepted — **implemented** (P13C-002 evidence 2026-08-08)
**Date:** 2026-07-31

## Context

Deterministic signals require durable evidence and idempotency without storing raw WebSocket payloads.

## Decision

Add `markets_price_observations` and `markets_liquidity_observations` tables:

- Bounded time-bucket coalescing (not per-tick)
- 7-day retention default
- Atomic signal + evidence writes via existing signal tables
- Idempotency keys include rule version, type, market, bucket timestamp, direction

No partitioning until measured volume justifies it.

## Consequences

- Migration `000017_markets_v1_realtime.up.sql`
- sqlc queries for observation upsert/list
- Signal producer reads from reconciler, writes observations then signals transactionally — **wired** (`LiveSignalCommitter` + `SignalPipeline`)

## Implementation status (2026-08-08)

| Deliverable | Path | Status |
|-------------|------|--------|
| Observation tables | `000017_markets_v1_realtime.up.sql` | done |
| sqlc upsert queries | `apps/backend/sql/queries/markets_queries.sql` | done |
| Live signal committer | `apps/backend/internal/markets/postgres/live_signal_commit.go` | done |
| Pipeline wiring | `apps/backend/internal/markets/realtime/signal_pipeline.go` | done |
| Integration proof | `live_signal_commit_test.go` | done (P13C-002) |

### Split from MKT-P1-008

| Path | Signals | Status |
|------|---------|--------|
| MKT-P1-008 / `CatalogSignalProducer` | `new_market`, `rule_changed` (catalog sync) | done |
| ADR-014 / `LiveSignalCommitter` | `price_move`, `liquidity_change` (reconciler observations) | done (P13C-002) |
