# MKT-P3-003 — Order cancel and status — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-003  
**Approval:** User approved plan implementation in chat (2026-08-09); `current_phase` **not** advanced.

## Summary

Frozen and extended `apps/backend/internal/markets/orders/`: preview (MKT-P3-001) unchanged; cancel preview/submit with hash binding and 24h idempotency; `GET /me/orders` and `GET /me/fills` projections for poll/reconcile handoff. Submit success and cancel outcomes persist in-memory (`ProjectionStore` v1). Routes mount under `RequireEligible` (write via eligible market group, list via eligible `/me` group). CLOB cancel injected via `VenueCanceller` in `factory.go` — no `clob/` edits in this task.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/orders/... -count=1` | **Pass** (2026-08-09) |
| `cd apps/backend && go build -o /dev/null ./cmd/markets-api/` | **Pass** |
| `cd apps/backend && go test ./migrations/... -count=1 -run OrdersFillsPreviews` | **Pass** |

## HTTP behavior

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/markets/orders/preview` | RequireEligible | Unchanged MKT-P3-001 |
| `POST` | `/markets/orders/submit` | RequireEligible | MKT-P3-002 glue; `unknown` + `unknown_reconciling` warning on timeout |
| `POST` | `/markets/orders/{orderId}/cancel-preview` | RequireEligible | Hash-bound cancel payload |
| `POST` | `/markets/orders/{orderId}/cancel` | RequireEligible | Idempotency-Key; 409/410/422 parity with submit |
| `GET` | `/markets/me/orders` | RequireEligible | `status=open` includes `open`, `partially_filled`, `cancel_pending`, `unknown` |
| `GET` | `/markets/me/fills` | RequireEligible | Empty until MKT-P3-005 fill ingest |

### Error parity (cancel POST)

| Case | Status | `error.code` |
|------|--------|--------------|
| Kill switch off | 503 | `capability_disabled` |
| Content hash mismatch | 409 | `integrity_mismatch` |
| Preview TTL exceeded | 410 | `preview_expired` |
| Missing Idempotency-Key | 400 | `missing_idempotency_key` |
| Idempotency replay (different body) | 422 | `idempotency_conflict` |
| Venue timeout | 200 | — (`status: cancel_pending`) |

## Test coverage added (this session)

| Test | Layer |
|------|-------|
| `TestCancelOrderIdempotencyReplay` | Service |
| `TestCancelOrderIdempotencyConflict422` | Service |
| `TestCancelOrderUnknownCancelPending` | Service |
| `TestListMyFillsEmpty` | Service |
| `TestListMyOrdersOpenFilterIncludesUnknown` | Service |
| `TestOrderCancel_HappyPath200` | HTTP glue |
| `TestOrderCancel_IntegrityMismatch409` | HTTP glue |
| `TestOrderCancel_IdempotencyConflict422` | HTTP glue |
| `TestListMyFills_Empty` | HTTP glue |

## Changed paths (this session)

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/orders/doc.go` | Package doc: preview, submit, cancel, list |
| `apps/backend/internal/markets/orders/cancel_test.go` | Cancel idempotency, unknown→cancel_pending, list filter tests |
| `apps/backend/internal/markets/orders/glue_test.go` | Cancel HTTP glue + empty fills glue |

## Prior session paths (baseline)

| Path | Role |
|------|------|
| `apps/backend/internal/markets/orders/cancel_preview.go` | Cancel preview service |
| `apps/backend/internal/markets/orders/cancel_preview_store.go` | Cancel preview TTL store |
| `apps/backend/internal/markets/orders/cancel.go` | Cancel submit + venue relay |
| `apps/backend/internal/markets/orders/cancel_idempotency.go` | 24h idempotency store |
| `apps/backend/internal/markets/orders/list.go` | List orders/fills |
| `apps/backend/internal/markets/orders/projection_store.go` | In-memory projections |
| `apps/backend/internal/markets/orders/handler.go` | Routes + error mapping |
| `apps/backend/internal/markets/orders/factory.go` | Shared `VenueSubmitter` + `VenueCanceller` |
| `apps/backend/cmd/markets-api/main.go` | `RegisterRoutes` + `RegisterMeRoutes` under RequireEligible |

## Kill switch

- `capabilities.features.order_submit` remains **false** in `service.go`.
- Cancel POST gated same as submit (`OrderSubmitEnabled` / `MARKETS_ORDER_SUBMIT_ENABLED`).

## Dependencies verified

| Dependency | Status |
|------------|--------|
| MKT-P3-002 submit glue | Green — [`MKT-P3-002-glue-evidence.md`](MKT-P3-002-glue-evidence.md) |
| Migration `000021` | Green — [`MKT-P3-orders-migration-evidence.md`](MKT-P3-orders-migration-evidence.md) |
| OpenAPI v1.3.0 | Frozen — no edits |

## Handoff — MKT-P3-005

1. Reconciliation worker repairs `status IN ('unknown', 'cancel_pending')` via CLOB poll (5s cadence per ORDER_LIFECYCLE)
2. Natural keys: `venueOrderId`, `clientOrderId`, upstream tuple
3. Store hooks: `ProjectionStore.UpdateOrder`, `ProjectionStore.AddFill` (fills empty until worker)
4. Client poll: `GET /markets/me/orders?status=open` after submit/cancel timeout — **never auto-resubmit** (D-06)
5. Postgres swap: replace in-memory store with sqlc queries on `markets_user_orders` / `markets_fills` (schema in `000021`)

## Blockers and gates

- **BLK-004:** remains open — no live cancel claims.
- **Postgres:** in-memory projections; `markets_user_orders` sqlc swap is separate store task.
- **`current_phase`:** not advanced.

## Explicit non-claims

- No mainnet cancel acceptance
- No BLK-004 clearance
- No fill invention (list returns empty until upstream reconcile)
- No `current_phase` advance
- No Postgres projection store wiring in this task
