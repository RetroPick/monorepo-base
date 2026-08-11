# MKT-P3-001 — Order preview endpoint — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-001  
**Approval:** User approved plan in chat (2026-08-09); `current_phase` remains **PHASE-2** (not advanced).

## Summary

Implemented `POST /api/v1/markets/orders/preview`: auth + `RequireEligible`, linked-maker validation, CLOB V2 unsigned payload assembly, SHA-256 `contentHash` binding, in-memory TTL preview store, and Prometheus counters. No CLOB submit.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/orders/... -count=1` | Pass |
| `cd apps/backend && go test ./internal/markets/... -count=1` | Pass |
| `cd apps/backend && go build -o /dev/null ./cmd/markets-api/` | Pass |

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Preview hash matches EIP-712 payload | `orders/testdata/preview_vectors.yaml` + `TestComputeContentHash_GoldenVectors` |
| 2 | `RequireEligible` enforced (403 default deploy) | `TestOrderPreview_AuthenticatedIneligible` |
| 3 | Unbound maker rejected | `TestPreview_MakerNotLinked` |
| 4 | Money fields fixed-point strings only | OpenAPI + handler types; no float money in preview path |
| 5 | No CLOB POST /order | Greenfield preview only; no submit handler |
| 6 | Builder attached server-side | `TestPreview_BuilderAttachedServerSide` + `MARKETS_BUILDER_CODE` env |
| 7 | OpenAPI contract path/schemas | `TestMarketsOpenAPIContainsPhaseOneReadContract` updated for v1.2.0 preview |

## Changed paths

| Path | Change |
|------|--------|
| `schemas/openapi/markets-v1.yaml` | v1.2.0 — `POST /markets/orders/preview` + schemas |
| `apps/backend/internal/markets/orders/**` | Preview service, handler, hash, store, factory, tests |
| `apps/backend/internal/markets/router.go` | `EligibleMarketRouteRegistrar` + auth/eligible group |
| `apps/backend/internal/markets/metrics.go` | `retropick_markets_order_preview_total` |
| `apps/backend/cmd/markets-api/main.go` | Orders preview wiring |
| `apps/backend/internal/markets/openapi_contract_test.go` | Preview path/schema assertions |

## Design notes

- Preview store: in-memory TTL (5 min); Postgres migration deferred to submit/reconcile tasks.
- Route lives at `/markets/orders/preview` (not under `/me`) per OpenAPI.
- BLK-001: production/staging preview still requires ops geo wiring; dev uses fixture eligibility in glue tests.

## Handoff

- **MKT-P3-002:** Submit must accept `previewId` + `contentHash` + signature; recompute hash → 409 on mismatch.
- **MKT-P3-004:** Client displays `humanSummary` + `contentHash` before wallet prompt.
