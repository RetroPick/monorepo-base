# MKT-P4 OpenAPI — positions / activity / portfolio summary — Evidence

**Date:** 2026-08-10  
**Agent:** Chat OA  
**Task:** PHASE-4 OpenAPI spec freeze (positions, activity, portfolio summary)  
**Approval:** User approved plan in chat (2026-08-10); `current_phase` remains **PHASE-2** (not advanced).

## Summary

OpenAPI **v1.4.0** freeze for PHASE-4 portfolio read surfaces: `listMyPositions`, `listMyActivity`, `getMyPortfolioSummary`. Contract doc §3.5 added with projection semantics, activity immutability, and WS handoff. No handlers, migrations, web client, or mainnet claims.

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/ -run TestOpenAPIRuntimeConformancePhaseOne -count=1` (from `apps/backend`) | **Partial** — kin-openapi spec load/validate **Pass**; `capabilities` subtest **Fail** (runtime missing `features.portfolio_read` — expected until MKT-P4-001 glue) |
| `go test ./internal/markets/ -run TestMarketsOpenAPIContainsPhaseOneReadContract -count=1` (from `apps/backend`) | **Fail** — `info.version = "1.4.0"` assertion stale (deferred to MKT-P4-001 glue per plan) |
| `rg -n 'type: number\|format: float\|format: double' schemas/openapi/markets-v1.yaml` | **Pass** — no matches on P4 portfolio schemas (pre-existing whale `minScore: number` on intelligence path unchanged) |
| `graphify update .` | **Pass** |

## OpenAPI paths added (all `x-phase: 4`, `MarketsSession`)

| Method | Path | operationId | Idempotency-Key |
|--------|------|-------------|-----------------|
| `GET` | `/markets/me/positions` | `listMyPositions` | — |
| `GET` | `/markets/me/activity` | `listMyActivity` | — |
| `GET` | `/markets/me/portfolio/summary` | `getMyPortfolioSummary` | — |

## Schemas added

| Schema | Purpose |
|--------|---------|
| `PositionResolutionState` | active / resolved / redeemable / redeemed |
| `UserPosition` | Position row wire |
| `PositionsListResponse` | Paginated positions |
| `ActivityEventType` | Immutable activity event enum |
| `ActivityEvent` | Activity row wire |
| `ActivityListResponse` | Paginated activity |
| `PortfolioPnLAggregate` | Summary totals |
| `PortfolioSummaryResponse` | Aggregate PnL/value response |

## Parameters added

| Parameter | Purpose |
|-----------|---------|
| `PositionResolutionStateFilter` | Query filter on positions |
| `ActivityEventTypeFilter` | Query filter on activity |

## Other schema changes

| Change | Detail |
|--------|--------|
| `UpstreamProvenance.source` | Added `polymarket_data` (Data API position source) |
| `CapabilitiesResponse.features` | Added required `portfolio_read` (default `false` in example) |

## Capabilities

- `CapabilitiesResponse.features.portfolio_read` documented as required boolean.
- Example on `GET /markets/capabilities` shows `portfolio_read: false`.
- Runtime handler does not yet emit `portfolio_read` — MKT-P4-001 glue scope.

## Changed paths

| Path | Change |
|------|--------|
| `schemas/openapi/markets-v1.yaml` | v1.4.0 — 3 paths, 8 schemas, 2 params, provenance + capabilities extension |
| `.dev/markets-v1/backend/API_AND_REALTIME_CONTRACTS.md` | §3.5 portfolio read semantics; §3.2 cleanup (removed frozen activity/positions); §0 worked example |

## Explicit non-goals (confirmed)

- No `apps/backend/internal/markets/portfolio/` or `positions/` handler implementation
- No CTF preview/relay or withdrawal OpenAPI paths (separate freeze task)
- No Postgres migrations
- No web/Android client changes
- No `current_phase` manifest advance
- No contract addresses or relayer secrets in examples
- `openapi_contract_test.go` version/path assertions deferred to MKT-P4-001 glue

## Doc drift (not in writable scope)

- [BACKEND_ARCHITECTURE.md](../../backend/BACKEND_ARCHITECTURE.md) lists `GET /markets/me/activity` as Phase 3 — web docs and §3.5 now say Phase 4; docs-curator follow-up.

## Handoff

| Consumer | Next work |
|----------|-----------|
| **MKT-P4-001** | `listMyPositions` + `getMyPortfolioSummary` handlers; emit `portfolio_read: false` in capabilities; update `openapi_contract_test.go` to v1.4.0 paths/schemas |
| **MKT-P4-002** | `listMyActivity`; immutable `markets_activity_events` projection |
| **MKT-P4-004+** | Separate OpenAPI freeze for CTF preview/relay + redemption status |
| **MKT-P4-002 web** | Regenerate TS types; wire portfolio page to BFF paths (not legacy `/api/v1/me/portfolio-summary`) |

## Sign-off

- [x] Three PHASE-4 paths with `x-phase: 4` and session security
- [x] Read-only GETs — no Idempotency-Key
- [x] Fixed-point money only (`DecimalString` / `MoneyAmount`) on portfolio schemas
- [x] `features.portfolio_read` documented with false example
- [x] Contract doc §3.5 projection + activity immutability + error codes
- [x] kin-openapi spec load/validate passes
- [x] No secrets in artifact
- [x] No invented contract addresses
