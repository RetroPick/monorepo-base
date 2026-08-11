# MKT-P4-001 — Position reconciliation — Evidence

**Date:** 2026-08-10  
**Task:** MKT-P4-001  
**Approval:** User authorized explicit PHASE-4 override in chat (2026-08-10); `current_phase` **not** advanced.

## Summary

Implemented greenfield position projection package in `apps/backend/internal/markets/positions/`: in-memory `ProjectionStore`, Data API `GET /positions` venue reader (httptest/sandbox), 5m reconcile worker with drift detection/repair, reorg `updating` states via `ReorgNotifier`, fixed-point `DecimalString` sizes, and `GET /me/positions` handler (`RegisterMeRoutes`) for RequireEligible glue. Metrics recorder exports `position_reconcile_lag_seconds`, `position_drift_count`, `position_drift_repairs_total`. Doc §6.6 added to POSITIONS_CTF_AND_REDEMPTION.md.

## Verification commands

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/positions/... -count=1 -v` | Pass (13 tests) |
| `go -C apps/backend build -o /dev/null ./cmd/markets-api/` | Pass |
| `go -C apps/backend test ./internal/markets/... -count=1` | Pre-existing OpenAPI conformance failures in root `markets` package (`TestOpenAPIRuntimeConformancePhaseOne`, `TestMarketsOpenAPIContainsPhaseOneReadContract`) — unrelated to positions; all other packages pass including `positions` |

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Venue drift → projection rebuild | `TestWorkerRepairsDriftFromVenue`, `TestComparePositionsDetectsDrift` |
| 2 | Reorg → `updating` then reconcile → `synced` | `TestWorkerReorgBeforeRepairMarksUpdating`, `TestWorkerMarksUpdatingOnReorg` |
| 3 | Drift metrics recorded | `TestMetricsRecordDriftCount`; `Recorder.Prometheus()` |
| 4 | Fixed-point wire JSON | `TestListMyPositions_FixedPointJSON` |
| 5 | Venue down → last projection + stale freshness | `TestListMyPositions_VenueDownServesLastProjection` |
| 6 | Read-only venue (GET only) | `TestDataAPIClient_RejectsMutatingMethods` |
| 7 | RequireEligible route pattern | `RegisterMeRoutes` + handler tests (session/eligibility via router mount) |
| 8 | Doc projection § updated | POSITIONS §6.6 |
| 9 | Evidence filed | This file |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/positions/doc.go` | Package contract |
| `apps/backend/internal/markets/positions/types.go` | Wire + domain types |
| `apps/backend/internal/markets/positions/errors.go` | Error types |
| `apps/backend/internal/markets/positions/projection_store.go` | In-memory store |
| `apps/backend/internal/markets/positions/compare.go` | Drift detection |
| `apps/backend/internal/markets/positions/metrics.go` | Metrics interface + Recorder |
| `apps/backend/internal/markets/positions/venue.go` | VenuePositionReader |
| `apps/backend/internal/markets/positions/data_venue.go` | Data API client |
| `apps/backend/internal/markets/positions/data_venue_test.go` | httptest venue |
| `apps/backend/internal/markets/positions/worker.go` | 5m reconcile loop |
| `apps/backend/internal/markets/positions/worker_test.go` | Worker tests |
| `apps/backend/internal/markets/positions/reorg.go` | ReorgNotifier |
| `apps/backend/internal/markets/positions/session.go` | Session + FillSource |
| `apps/backend/internal/markets/positions/reader.go` | List orchestration |
| `apps/backend/internal/markets/positions/handler.go` | HTTP handler |
| `apps/backend/internal/markets/positions/handler_test.go` | Handler tests |
| `apps/backend/internal/markets/positions/factory.go` | Production wiring helpers |
| `.dev/markets-v1/polymarket/POSITIONS_CTF_AND_REDEMPTION.md` | §6.6 projection spec |

## Glue handoff (outside MKT-P4-001 owned_paths)

Requires separate glue task approval for `apps/backend/cmd/markets-api/main.go`, `apps/backend/internal/markets/metrics.go`, and router registration.

1. **Shared store + config** in `main.go`:

```go
posStore := positions.NewProjectionStore()
posCfg := positions.ProductionConfig{
    Discoverer: disc,
    DataAPIURL: cfg.DataAPIURL, // or env default https://data-api.polymarket.com
    Store:      posStore,
    Metrics:    positionMetrics, // positions.NewRecorder() or extend markets.Metrics
}
```

2. **Register route** inside existing eligible `/me` group:

```go
positions.RegisterMeRoutes(r, positions.NewProductionHandlerConfig(posCfg))
```

3. **Start worker** (mirror order reconcile block):

```go
if positions.PositionReconcileEnabled() {
    go func() {
        if err := positions.NewProductionWorker(posCfg).Run(workerCtx); err != nil && err != context.Canceled {
            log.Error("position reconcile worker stopped", "err", err)
        }
    }()
}
```

4. **Prometheus:** append `positions.NewRecorder().Prometheus()` output in `/metrics` handler, or add delegate methods on `markets.Metrics` implementing `positions.Metrics`.

5. **Optional:** inject `FillSource` adapter reading order fills for empty-store seed; wire `ReorgNotifier` when chain indexer lands.

## Blockers and gates

- **BLK-004:** Live Data API / CLOB integration — tests use httptest only; blocker **remains open**.
- **OpenAPI:** `listMyPositions` not yet in `markets-v1.yaml` — separate contract freeze task.
- **Postgres:** in-memory projections; `position_projections` migration is separate.
- **Human approval gate:** Real mainnet position reconcile — **not cleared**.

## Handoff — MKT-P4-002

1. Portfolio UI consumes `GET /markets/me/positions` + `syncStatus` / `freshness` badges
2. Glue task wires handler + worker in `markets-api`
3. OpenAPI `Position` schema freeze before client codegen

## Explicit non-claims

- No mainnet position reconcile success
- No BLK-004 clearance
- No `current_phase` advance
- No CTF redeem/split/merge (MKT-P4-004)
- No whale feed or wallet profile (SM-I-001 / SM-I-003)
- No ownership-authority claims — projections only
