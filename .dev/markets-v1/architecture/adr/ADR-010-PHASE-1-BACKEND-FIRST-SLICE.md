# ADR-010: Phase 1 Backend-First Read-Market Slice

**Status:** accepted for this implementation run  
**Date:** 2026-07-30  
**Deciders:** repository owner (uploaded implementation assignment), implementation agent

## Context

The repository manifest still describes a documentation-only Phase 0, while
the repository already contains a partial Markets BFF and the 2026-07-30
implementation assignment explicitly authorizes a backend-first Phase 1 run.
The existing Phase 1 task graph also includes web and Android deliverables that
the assignment explicitly excludes.

Current official Polymarket documentation confirms separate public Gamma
catalog, CLOB order-book/history, and market WebSocket interfaces. The public
WebSocket payloads expose timestamps and hashes but no authoritative sequence
number, so the existing ADR-005 wording cannot safely imply sequence-based gap
recovery.

## Decision

This run implements the Markets V1 backend foundation and public read vertical
slice only:

- canonical OpenAPI and Go domain contracts;
- Gamma catalog and CLOB market-data anti-corruption clients;
- PostgreSQL projections, bounded raw payload retention, and checkpoints;
- event and market detail, order-book, history, health, capability, and signal
  read APIs;
- snapshot/hash/timestamp-based freshness, gap detection, and resynchronization;
- deterministic Phase 1 signal envelopes;
- observability, security controls, fixtures, tests, and operator handoff.

Web UI, Android UI/modules, identity, funding, signing, trading, portfolio,
notifications, PRISM, custom contracts, and production deployment remain
deferred. ADR-004 still governs the future shared client contract; deferral in
this run does not change that architecture.

For realtime market data, the BFF treats a CLOB snapshot as authoritative.
Because upstream does not document a monotonic sequence, deltas are accepted
only against the expected snapshot hash and timestamp window. A mismatch,
backward timestamp, disconnect, or age breach marks the book `resyncing` or
`stale` and forces a new snapshot. The API never labels such a book live.

## Gate result

`PASS_WITH_FOCUSED_ADR`

The direct 2026-07-30 backend-first implementation assignment is the human
authorization to move this branch from the documentation baseline into this
bounded Phase 1 slice. Production writes, custody, signing, fund movement, and
deployment remain separately gated.

## Consequences

- `current_phase` advances to `PHASE-1` for this implementation branch.
- Existing web and Android Phase 1 tasks are deferred without implementation.
- The backend exit gate is based on contract conformance, deterministic
  fixtures, migration verification, freshness/degraded-state behavior, and
  absence of transactional scope.
- Upstream endpoint, rate-limit, and realtime assumptions are dated evidence
  and must be revalidated when Polymarket documentation or payload versions
  change.

## Official evidence (retrieved 2026-07-30)

- https://docs.polymarket.com/getting-started/api
- https://docs.polymarket.com/api-reference/events/list-events
- https://docs.polymarket.com/api-reference/events/get-event-by-id
- https://docs.polymarket.com/api-reference/markets/get-market-by-id
- https://docs.polymarket.com/market-data/prices-order-books
- https://docs.polymarket.com/api-reference/wss/market
- https://docs.polymarket.com/api-reference/rate-limits

## Rollback

Revert the Phase 1 migrations and application commits before deployment. The
down migration removes only new `markets_*` projections; it does not alter
legacy epoch data. Retain this ADR and reconciliation evidence as historical
records.
