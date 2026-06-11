# SQLC and database query layer

This doc explains how the project uses SQLC to generate typed query helpers, and how those helpers are used by the API and indexer.

## SQLC configuration

File: `apps/backend/sqlc.yaml`

- engine: Postgres\n- schema: `apps/backend/sql/schema.sql`\n- queries: `apps/backend/sql/queries/*`\n- output Go package:\n  - package name: `dbqueries`\n  - output dir: `apps/backend/internal/dbqueries`\n  - sql package: `pgx/v5`

Important: `sql/schema.sql` is a mirror of migrations for SQLC generation. If it diverges from the real migrations, SQLC types may not match runtime.

## Queries file

The main query set is in:

- `apps/backend/sql/queries/queries.sql`

It defines:\n\n- `indexer_state` helpers\n- template/ledger/epoch helpers\n- keeper schedule/execution listings\n- incidents listings and counts\n- user chain event queries\n- watchlist queries\n- frontend visibility controls

## Generated output

SQLC generates:

- `apps/backend/internal/dbqueries/db.go`\n- `apps/backend/internal/dbqueries/models.go`\n- `apps/backend/internal/dbqueries/queries.sql.go`

API and indexer code typically uses:\n\n- `q := dbqueries.New(poolOrTx)`\n- then calls typed methods like `GetIndexerState`, `ListTemplatesWithLedger`, etc.

## Pool vs transaction usage

Patterns:\n\n- In API handlers, `dbqueries.New(pool)` is used for simple reads.\n- In indexer `SyncOnce`, `dbqueries.New(tx)` is used inside a transaction so projection updates and indexer_state updates commit atomically.\n- Some code paths mix raw SQL with SQLC calls for convenience (e.g. complex projection recomputation).

## Source pointers

- `apps/backend/sqlc.yaml`\n- `apps/backend/sql/schema.sql`\n- `apps/backend/sql/queries/queries.sql`\n- `apps/backend/internal/dbqueries/*`

