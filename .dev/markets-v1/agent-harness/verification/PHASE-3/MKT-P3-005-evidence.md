# MKT-P3-005 — Unknown order reconciliation worker — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-005  
**Approval:** User approved plan in chat (2026-08-09); `current_phase` **not** advanced.

## Summary

Implemented unknown-order reconciliation worker in `apps/backend/internal/markets/reconcile/`: polls CLOB `GET /data/orders` (L2) and `GET /data/trades`, matches `unknown` projections by `client_order_id`/salt fingerprint, repairs to `open`/`rejected` (90s grace), resolves `cancel_pending` → `canceled`, ingests fills idempotently. **Never auto-resubmits** — worker has read-only venue access only. Wired in `markets-api` with `MARKETS_RECONCILE_ENABLED` gate (default on). Metrics exported on `/metrics`.

## Verification commands

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/reconcile/... -count=1 -v` | Pass |
| `go -C apps/backend test ./internal/markets/clob/... -count=1 -run DataOrders` | Pass (no filter match; full clob suite pass) |
| `go -C apps/backend test ./internal/markets/orders/... -count=1 -run 'Unknown\|Reconcile\|Submit'` | Pass |
| `go -C apps/backend test ./internal/markets/... -count=1` | Pass |
| `go -C apps/backend build -o /dev/null ./cmd/markets-api/` | Pass |

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Unknown timeout → worker repairs to `open` on venue match | `TestWorkerRepairsUnknownByVenueOrderID`, `TestWorkerRepairsUnknownByFingerprint` |
| 2 | No match after grace → `rejected`, not resubmit | `TestWorkerRejectsUnknownAfterGrace` |
| 3 | Never auto-resubmit | `TestWorkerNeverAutoResubmitsUnknownWithoutVenueMatch`; worker has no `VenueSubmitter` |
| 4 | Reconcile lag metric recorded | `TestMetricsRecordReconcile`; Prometheus `order_reconcile_lag_seconds` |
| 5 | httptest/sandbox only for CLOB | `clob/data_test.go`; BLK-004 remains open |
| 6 | Doc reflects behavior | INDEXING §5.1 updated |
| 7 | Evidence filed | This file |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/reconcile/doc.go` | Package contract + never-resubmit policy |
| `apps/backend/internal/markets/reconcile/match.go` | client_order_id + fingerprint matching |
| `apps/backend/internal/markets/reconcile/match_test.go` | Match unit tests |
| `apps/backend/internal/markets/reconcile/worker.go` | Worker loop, grace, fill ingest, metrics hooks |
| `apps/backend/internal/markets/reconcile/worker_test.go` | Integration tests incl. never-resubmit |
| `apps/backend/internal/markets/clob/data.go` | Extended `VenueOpenOrder` (salt, amounts, COID) |
| `apps/backend/internal/markets/clob/data_test.go` | httptest for match fields |
| `apps/backend/internal/markets/orders/projection_store.go` | Match fields, `ListUnknown`, `ApplyReconcile` |
| `apps/backend/internal/markets/orders/list.go` | Persist salt/content_hash/client_order_id on submit |
| `apps/backend/internal/markets/orders/types.go` | Exported status constants |
| `apps/backend/internal/markets/metrics.go` | Reconcile repair/scanned/error metrics |
| `apps/backend/internal/markets/metrics_test.go` | Reconcile metrics test |
| `apps/backend/cmd/markets-api/main.go` | Worker goroutine + interval/grace config |
| `.dev/markets-v1/backend/INDEXING_RECONCILIATION_AND_REORGS.md` | §5.1 unknown worker spec |

## Blockers and gates

- **BLK-004:** CLOB integration — reconcile uses same L2 client; blocker **remains open** until live integration + ops sign-off.
- **Human approval gate:** Real on-chain order — **not cleared**; no fabricated mainnet success.
- **Postgres:** in-memory projections; `reconciliation_runs` table + sqlc store swap is separate task.

## Handoff — MKT-P3-007

1. Order ticket UX: surface `unknown_reconciling` → resolved states from `GET /markets/me/orders`
2. Postgres projection store replacing in-memory v1
3. Fill/position/deep reconcile loops (INDEXING §3 — separate tasks)

## Explicit non-claims

- No mainnet reconcile success
- No BLK-004 clearance
- No `current_phase` advance
- No `reconciliation_runs` Postgres persistence in this task
