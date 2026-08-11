# MKT-P3-002 — BFF order submit glue — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-002 glue chat (HTTP `POST /markets/orders/submit`)  
**Approval:** User requested glue chat after clob-only MKT-P3-002; `current_phase` **not** advanced.

## Summary

Wired BFF `POST /api/v1/markets/orders/submit` through `apps/backend/internal/markets/orders/`: kill-switch gate (`order_submit` default **false** → **503**), required `Idempotency-Key`, preview load + user binding, content-hash re-verify (**409**), preview TTL (**410**), idempotency replay/conflict (**422**), CLOB relay via injected `VenueSubmitter`, timeout → **201** `unknown` + `unknown_reconciling` (no auto-resubmit). Factory wires `clob.NewTradingClient` when submit enabled via env.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/orders/... -count=1 -run 'Glue\|Submit'` | Pass |
| `cd apps/backend && go test ./internal/markets/... -count=1` | Pass |
| `cd apps/backend && go build -o /dev/null ./cmd/markets-api/` | Pass |

## HTTP behavior (glue tests)

| Case | Status | Error code |
|------|--------|------------|
| Kill switch off (`OrderSubmitEnabled: false`) | 503 | `capability_disabled` |
| Content hash mismatch | 409 | `integrity_mismatch` |
| Preview TTL exceeded | 410 | `preview_expired` |
| Missing `Idempotency-Key` | 400 | `missing_idempotency_key` |
| Idempotency key replay (different body) | 422 | `idempotency_conflict` |
| Happy path (stub venue) | 201 | — |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/orders/submit.go` | Submit service: gate, idempotency, 409/410, CLOB relay |
| `apps/backend/internal/markets/orders/idempotency.go` | In-memory 24h idempotency store |
| `apps/backend/internal/markets/orders/types.go` | `SubmitRequest` / `SubmitResponse`; preview `UserID` |
| `apps/backend/internal/markets/orders/errors.go` | Submit error types |
| `apps/backend/internal/markets/orders/store.go` | `Delete`; `Get` no longer evicts (410 path) |
| `apps/backend/internal/markets/orders/handler.go` | `POST /orders/submit`; unified error mapping |
| `apps/backend/internal/markets/orders/factory.go` | `clob.NewTradingClient`; env kill-switch |
| `apps/backend/internal/markets/orders/preview.go` | Sync store/idempotency clocks with `cfg.Now` |
| `apps/backend/internal/markets/orders/*_test.go` | Service + HTTP glue tests |
| `apps/backend/internal/markets/metrics.go` | `RecordOrderSubmit` counters |
| `apps/backend/cmd/markets-api/main.go` | `SubmitMetrics` wiring |
| `apps/backend/internal/markets/openapi_contract_test.go` | Submit route + schemas; version `1.3.0` |

## Kill switch

- Public capability `capabilities.features.order_submit` remains **false** in `service.go`.
- Runtime submit requires `OrderSubmitEnabled` / `MARKETS_ORDER_SUBMIT_ENABLED` (dev/staging only until ops gate).

## Blockers and gates

- **BLK-004:** CLOB integration — client + BFF glue implemented; blocker **remains open** until live L2 creds + ops sign-off.
- **Human approval gate:** No mainnet order acceptance claimed.
- **`current_phase`:** Not advanced.

## Handoff — MKT-P3-003

1. Cancel / list open orders
2. Reconcile `unknown_reconciling` submits (MKT-P3-005)
3. Ops staging checklist (BLK-004) before enabling kill switch in staging

## Explicit non-claims

- No mainnet order acceptance
- No BLK-004 clearance
- No `current_phase` advance
