# MKT-P3 — Orders/fills/previews migration — Evidence

**Task:** PHASE-3 trading DDL (Chat Mig)  
**Date:** 2026-08-09  
**Migration:** `000021_markets_v1_orders_fills_previews`

## Summary

Expand-only Phase-3 trading persistence landed in `public` schema:

| Physical table | Logical name | Role |
|----------------|--------------|------|
| `markets_order_previews` | `markets.order_previews` | Preview-before-sign bind (TTL + `consumed_at`) |
| `markets_user_orders` | `markets.orders` | User order projection incl. `unknown` status |
| `markets_order_attempts` | `markets.order_attempts` | Submit audit trail |
| `markets_fills` | `markets.fills` | Fill projections; upstream tuple unique |

Conventions: app-supplied UUID v7 PKs; `UNIQUE (idempotency_key)` on `markets_user_orders`; no float money columns; prices/sizes as `TEXT` (DecimalString); fees as `BIGINT` + currency/decimals.

## Commands and results

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./migrations/... -v -run OrdersFillsPreviews` | PASS |
| `go -C apps/backend test ./migrations/... -v` | PASS (all migration tests) |

## Files changed

| Path | Change |
|------|--------|
| `apps/backend/migrations/000021_markets_v1_orders_fills_previews.up.sql` | New — 4 tables + indices/FKs |
| `apps/backend/migrations/000021_markets_v1_orders_fills_previews.down.sql` | New — symmetric DROP |
| `apps/backend/migrations/markets_v1_test.go` | `TestMarketsV1OrdersFillsPreviewsMigration` |
| `.dev/markets-v1/backend/DATABASE_AND_MIGRATIONS.md` | §4B Phase-3 trading DDL + orders section |

## Invariant checks

- [x] `status` CHECK includes `'unknown'` on `markets_user_orders`
- [x] `UNIQUE (idempotency_key)` on `markets_user_orders`
- [x] `UNIQUE (upstream_source, upstream_id)` on `markets_fills`
- [x] No `DOUBLE PRECISION` / `REAL` / `FLOAT` in `000021` up migration
- [x] FK to `markets_wallet_accounts`; cross-table FKs among trading tables

## Handoff — sqlc / store (Chat Sub / Can / Rec)

**Not in scope for this task:** sqlc regen, store wiring, CLOB HTTP, preview handler Postgres swap.

| Store concern | Table | Suggested queries |
|---------------|-------|-------------------|
| Preview TTL + submit bind | `markets_order_previews` | Insert, GetByID, MarkConsumed, DeleteExpired |
| Idempotent submit | `markets_user_orders` | InsertOnConflictIdempotencyKey, GetByIdempotencyKey, UpdateStatus |
| Submit audit | `markets_order_attempts` | Insert, ListByOrder, UpdateStatus |
| Fill reconcile | `markets_fills` | UpsertUpstreamTuple, ListByOrder, ListByUser |
| Unknown repair | `markets_user_orders` | ListByStatus(`unknown`), UpdateFromReconcile |

Replace in-memory [`PreviewStore`](../../../../apps/backend/internal/markets/orders/store.go) in a separate store task.

**Status vocabulary:** `markets_user_orders.status` uses domain states (incl. `unknown`); `markets_order_attempts.attempt_status` uses SIGNING attempt states — do not merge enums.

## Next gated steps

- Chat Sub: CLOB V2 submit (`MKT-P3-002`) using `markets_order_attempts` + idempotency
- Chat Can: cancel/status (`MKT-P3-003`) reading `markets_user_orders`
- Chat Rec: reconciliation worker (`MKT-P3-005`) repairing `unknown` via upstream tuple / `client_order_id`
