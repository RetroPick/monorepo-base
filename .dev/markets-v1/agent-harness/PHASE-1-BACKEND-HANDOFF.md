# Phase 1 Backend Handoff — RetroPick Markets V1

## Summary

Backend-first Phase 1 public-read slice is implemented and verified. The Go BFF
exposes versioned Markets V1 read APIs backed by Polymarket Gamma and CLOB
anti-corruption clients, PostgreSQL projections, deterministic signals,
realtime envelope contracts, and bounded observability. Scope is limited by
ADR-010: no web/Android UI, trading, custody, signing, or PRISM.

## Task ID

MKT-P1-010 — Verification, traceability, and handoff (completes MKT-P1-000
through MKT-P1-009).

## Changes

| Path | Summary |
|------|---------|
| `schemas/openapi/markets-v1.yaml` | Phase 1 read contract (events, markets, orderbook, history, health, signals) |
| `apps/backend/internal/markets/` | Canonical types, service, handlers, gamma/clob adapters, catalog sync, marketdata, realtime, signals, metrics |
| `apps/backend/migrations/000016_markets_v1_foundation.*.sql` | Catalog, market-data, health, signals, checkpoints, raw upstream evidence |
| `apps/backend/sql/queries/markets_queries.sql` | sqlc queries for Markets projections |
| `apps/backend/internal/config/config.go` | Official upstream host validation in production |
| `apps/backend/internal/api/health.go` | Canonical `/api/v1/health/live` and `/ready` aliases |
| `.github/workflows/ci.yml` | OpenAPI, migration, and Markets package gates |
| `.dev/markets-v1/agent-harness/` | Reconciliation, evidence, traceability, task graph, manifest |

## Verification run

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/... -count=1` | pass (exit 0) |
| `go -C apps/backend test ./internal/config ./internal/api ./migrations -count=1` | pass (exit 0) |
| `go -C apps/backend test ./internal/markets -run TestMarketsOpenAPIContainsPhaseOneReadContract -count=1` | pass (exit 0) |
| `go -C apps/backend test ./migrations -run TestMarketsV1Migration -count=1` | pass (exit 0) |
| `go -C apps/backend build ./...` | pass (exit 0) |
| `sqlc generate && git diff --exit-code internal/dbqueries` | pass (exit 0) |
| `go -C apps/backend test ./... -count=1` | fail (exit 1) — pre-existing `internal/registry` missing fixture on `main` |

## Evidence

- Task evidence: `.dev/markets-v1/agent-harness/evidence/MKT-P1-001.yaml` through `MKT-P1-010.yaml`
- Reconciliation: `.dev/markets-v1/agent-harness/RECONCILIATION_REPORT.md`
- Focused ADR: `.dev/markets-v1/architecture/adr/ADR-010-PHASE-1-BACKEND-FIRST-SLICE.md`
- Traceability: `.dev/markets-v1/agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md`

## Public API surface (read-only)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/markets/capabilities` | Feature flags and version |
| GET | `/api/v1/markets/events` | Paginated event catalog |
| GET | `/api/v1/markets/events/{eventId}` | Event detail |
| GET | `/api/v1/markets/markets/{marketId}` | Market detail |
| GET | `/api/v1/markets/markets/{marketId}/orderbook` | Order book snapshot (`tokenId` query required) |
| GET | `/api/v1/markets/markets/{marketId}/history` | Price history |
| GET | `/api/v1/markets/markets/{marketId}/health` | Market health |
| GET | `/api/v1/markets/intelligence/signals` | Deterministic signals list |
| GET | `/api/v1/health/live` | Liveness (upstream-independent) |
| GET | `/api/v1/health/ready` | Readiness (degraded dependencies reported) |

Operator notes: `apps/backend/internal/markets/README.md`

## Open issues / blockers

| Issue | Severity | Notes |
|-------|----------|-------|
| `internal/registry` test expects missing `packages/contracts/registry.celo-alfajores.json` | low | Present on `main`; unrelated to Markets V1 |
| Postgres repository tests require `DATABASE_URL` | low | Skipped in CI-less local runs; migration smoke covers DDL |
| Graphify CLI unavailable | low | Run `graphify update .` locally after merge |
| Catalog sync worker not wired to API process yet | medium | Persistence and syncer implemented; background job wiring is Phase 1.5 / ops follow-up |
| CLOB WebSocket ingest not connected to HTTP hub | medium | Realtime session contract and envelope types ready; WS bridge is next integration step |

## Suggested next task

1. **Client integration (web)**: consume `schemas/openapi/markets-v1.yaml` for event list and market detail against the BFF.
2. **Background catalog sync**: schedule `catalog.Syncer` with checkpoint persistence and degraded-mode metrics.
3. **Realtime bridge**: connect CLOB market WebSocket to `realtime.Session` and existing websocket hub with hash-based resync.
4. **Registry fixture**: restore or skip `packages/contracts/registry.celo-alfajores.json` so `go test ./...` is green on `main`.

## Implementation notes

- Monetary values are decimal strings end-to-end; never float64 in public models.
- Realtime envelopes set `sequence` to null; consistency uses snapshot hash and forced resnapshot.
- Production config rejects non-official or non-HTTPS Gamma/CLOB hosts.
- Legacy epoch APIs remain frozen at `/api/v1/legacy/markets/*`.

## Related documents

- [AGENT_OPERATING_CONTRACT.md](AGENT_OPERATING_CONTRACT.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
- [PHASE-1-FOUNDATION-AND-READ-MARKETS.md](../phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md)
