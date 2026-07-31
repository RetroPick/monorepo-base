# ADR-014: Phase 1.3 Observation Persistence

**Status:** Accepted  
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
- Signal producer reads from reconciler, writes observations then signals transactionally
