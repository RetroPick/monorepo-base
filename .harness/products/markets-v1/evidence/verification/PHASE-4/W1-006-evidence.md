# W1-006 — P4 glue: positions/portfolio/activity routes wired into markets BFF — Evidence

**Date:** 2026-08-11
**Task:** W1-006 (release-factory card) — completes R0-004 D2 ("positions implemented but not wired in `cmd/markets-api/main.go`") and the MKT-P4-001 glue handoff.
**Branch:** `agent/w1-006-backend`
**Repo head before work:** `ec62f3bf1`

## Summary

Mounted the OpenAPI v1.4.0 PHASE-4 portfolio read surface on the markets BFF, behind the `portfolio_read` capability gate (kept `false` until QA green, per task constraint):

| Path | Handler | State |
|------|---------|-------|
| `GET /api/v1/markets/me/positions` | `positions.RegisterMeRoutes` (real projection reader + venue reconcile path) | mounted; 503 `capability_disabled` while gate closed |
| `GET /api/v1/markets/me/activity` | `markets.PortfolioNotImplementedHandler` (placeholder; implementation is MKT-P4-002 follow-up) | mounted; 503 while gate closed |
| `GET /api/v1/markets/me/portfolio/summary` | `markets.PortfolioNotImplementedHandler` (placeholder) | mounted; 503 while gate closed |

Glue delivered:

1. `internal/markets/portfolio_glue.go` — `PortfolioReadGate` middleware (503 `capability_disabled` / "portfolio_read is disabled" while `features.portfolio_read` is false, `Cache-Control: private, no-store`, exact OpenAPI `ApiError` shape) + `PortfolioNotImplementedHandler` (explicit 501 if ever reached with the gate open).
2. `cmd/markets-api/main.go` — portfolio route group mounted inside the eligible `/me` registrar behind the gate; position reconcile worker started behind `positions.PositionReconcileEnabled()` (mirrors the orders reconcile block; in-memory store stays empty while routes are gated, so the worker is inert); `positions.NewRecorder().Prometheus()` appended to `/metrics`.
3. `internal/markets/config/config.go` — new `DataAPIURL` (env `MARKETS_DATA_API_URL`, default `https://data-api.polymarket.com`) consumed by `positions.ProductionConfig`.

Migrations `000022` (positions/activity DDL) and `000023` (order mutation journal) are already embedded via `migrations/embed.go` (`//go:embed *.sql`) and applied by `db.RunMigrations` — **verified, no wiring change needed** (verify-only per task).

## Verification commands

| Command | Result |
|---------|--------|
| `go build ./...` (from `apps/backend`) | PASS exit 0 |
| `go vet ./cmd/markets-api/ ./internal/markets/` | PASS exit 0 |
| `go test ./internal/markets/config/ ./internal/markets/ ./cmd/markets-api/ -count=1` | PASS |
| `go test ./migrations/... -count=1` | PASS (incl. `TestMarketsV1PositionsActivityMigration`, `TestMarketsV1OrderMutationJournalExpandsExistingOrderTables`) |
| `go test ./... -count=1` | PASS — full backend suite (see below) |
| `go test ./internal/markets/ -run TestPortfolioReadRoutesGatedWhenCapabilityDisabled -count=1 -v` | PASS — 503 for all three PHASE-4 paths, body validated against the OpenAPI v1.4.0 `ApiError` schema |

## New tests

- `internal/markets/portfolio_gate_test.go` — `TestPortfolioReadRoutesGatedWhenCapabilityDisabled`: mounts the exact W1-006 production wiring (gate + positions handler + placeholders) and asserts each PHASE-4 path returns `503 capability_disabled` with `Cache-Control: private, no-store`, validated against the live `schemas/openapi/markets-v1.yaml` via kin-openapi; also asserts `features.portfolio_read == false` (guards the FORBIDDEN "flip to true" rule).
- `internal/markets/config/config_test.go` — `TestLoad_DataAPIURLEnvOverride` + default assertion in `TestLoad_MarketsAPIDefaults`.

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/portfolio_glue.go` | New — capability gate + placeholder handlers (glue) |
| `apps/backend/internal/markets/portfolio_gate_test.go` | New — gate conformance test |
| `apps/backend/cmd/markets-api/main.go` | Mount portfolio routes behind gate; position reconcile worker; `/metrics` includes position metrics |
| `apps/backend/internal/markets/config/config.go` | Add `DataAPIURL` (env `MARKETS_DATA_API_URL`) |
| `apps/backend/internal/markets/config/config_test.go` | DataAPIURL default + env override tests |
| `.harness/products/markets-v1/evidence/verification/PHASE-4/W1-006-evidence.md` | This file |

## Constraints honored

- `portfolio_read` remains `false` in `Service.Capabilities` (hardcoded, unchanged) — gate open only when QA flips it.
- `order_submit` / CLOB submit enablement untouched.
- OpenAPI contract (`schemas/openapi/markets-v1.yaml`) untouched.
- `positions` package untouched (wiring only; store is the existing in-memory `ProjectionStore`).
- No mainnet claims: positions are projections; real venue reconcile remains gated behind capability + `MARKETS_POSITION_RECONCILE_ENABLED`.

## Handoff

- **QA (W1-005 lane):** flip `portfolio_read` to `true` in `Service.Capabilities` once QA is green — gate opens, `/me/positions` starts serving the projection reader; `/me/activity` + `/me/portfolio/summary` still answer `501 not_implemented` until their implementations land (MKT-P4-002 activity feed + portfolio summary follow-ups).
- **MKT-P4-002:** implement `listMyActivity` against `markets_activity_events` (migration 000022) and `getMyPortfolioSummary`; swap the placeholder handlers.
- **BLK-004:** live Data API venue behavior still httptest/sandbox-verified only.
