# MKT-P4 — Positions/activity migration — Evidence

**Task:** PHASE-4 portfolio DDL (Chat Mig)  
**Date:** 2026-08-10  
**Migration:** `000022_markets_v1_positions_activity`

## Summary

Expand-only Phase-4 portfolio persistence landed in `public` schema:

| Physical table | Logical name | Role |
|----------------|--------------|------|
| `markets_position_projections` | `markets.position_projections` | Reconciled per-outcome inventory for `/me/positions` |
| `markets_activity_events` | `markets.activity_events` | Append-only activity log (MKT-DATA-001) |

Conventions: app-supplied UUID v7 PKs; `UNIQUE (user_id, account_wallet, token_id)` on positions; `UNIQUE (upstream_source, upstream_id)` on both tables; no float money columns; sizes/prices/PnL as `TEXT` (DecimalString); cost basis and fees as `BIGINT` + currency/decimals.

**Deferred:** `markets_ctf_operations` (MKT-P4-004), `markets_redemption_projections` (MKT-P4-005).

## Commands and results

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./migrations/... -v -run PositionsActivity` | PASS |
| `go -C apps/backend test ./migrations/... -v` | PASS (all migration tests) |
| `rg -i 'float\|double precision\|real' apps/backend/migrations/000022*.sql` | No SQL float types (column names `realized_pnl`/`unrealized_pnl` matched substring only) |

## Files changed

| Path | Change |
|------|--------|
| `apps/backend/migrations/000022_markets_v1_positions_activity.up.sql` | New — 2 tables + indices/FKs |
| `apps/backend/migrations/000022_markets_v1_positions_activity.down.sql` | New — symmetric DROP |
| `apps/backend/migrations/markets_v1_test.go` | `TestMarketsV1PositionsActivityMigration` |
| `.dev/markets-v1/backend/DATABASE_AND_MIGRATIONS.md` | §4C Phase-4 portfolio DDL + stub cross-refs |

## Invariant checks

- [x] `resolution_status` CHECK includes `active`, `resolved`, `redeemable`, `redeemed`, `unknown`
- [x] `freshness_state` CHECK includes `fresh`, `stale`, `reconciling`, `drift_detected`
- [x] `UNIQUE (user_id, account_wallet, token_id)` on `markets_position_projections`
- [x] `UNIQUE (upstream_source, upstream_id)` on both tables
- [x] No `DOUBLE PRECISION` / `REAL` / `FLOAT` SQL types in `000022` up migration
- [x] FK to `markets_wallet_accounts`; activity FKs to `markets_user_orders`, `markets_fills`
- [x] Expand-only: no `ALTER` on Phase-1/2/3 tables

## Handoff — sqlc / store (Chat Pos)

**Not in scope for this task:** sqlc regen, store wiring, Data API client, reconcile workers, OpenAPI Position/Activity schemas.

| Store concern | Table | Suggested queries |
|---------------|-------|-------------------|
| Position reconcile upsert | `markets_position_projections` | UpsertPositionProjection, ListPositionsByUser, GetPositionByUserWalletToken, ListStalePositions |
| Activity ingest (immutable) | `markets_activity_events` | InsertActivityEvent, InsertActivityEventOnConflictDoNothing, ListActivityByUser (cursor on `observed_at`) |
| Cross-links | activity | Join optional `order_id` / `fill_id` for enriched feed |

**Files Chat Pos owns:**

- `apps/backend/sql/queries/markets_queries.sql`
- `apps/backend/sqlc.yaml` — regen via `sqlc generate`
- `apps/backend/internal/dbqueries/` — generated
- `apps/backend/internal/markets/positions/` — store implementation

**Status vocabulary:** `resolution_status` (market lifecycle) ≠ `freshness_state` (projection SLA) — do not merge enums.

**Upstream id fallback:** when Data API omits a stable position id, use `{account_wallet}:{token_id}` as `upstream_id`.

## Next gated steps

- Chat Pos: sqlc queries + position projection store (`MKT-P4-001`)
- Activity feed worker reading `markets_activity_events` (`MKT-P4-002`)
- CTF DDL migration at MKT-P4-004 (separate from `000022`)
