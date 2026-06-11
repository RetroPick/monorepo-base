# Database and migrations

This doc describes the Postgres schema, migration mechanics, and how backend components depend on DB state.

## Migration mechanism

Migrations are embedded into the Go binary:

- Embedding: `apps/backend/migrations/embed.go` (`//go:embed *.sql`)
- Runner: `apps/backend/internal/db/migrate.go` (`RunMigrations`, `WaitForSchema`)
- One-shot CLI: `apps/backend/cmd/migrator/main.go` calls `db.RunMigrations(DATABASE_URL)`

### Key behaviors

- **Retry on transient DB errors**: both `RunMigrations` and `WaitForSchema` retry transient reachability errors (DNS, connection refused) up to a fixed timeout.
- **Timeout window**: `waitSchemaTimeout` is **5 minutes**.
- **Version skew safety**: if the DB is **ahead** of the embedded migration set (older binary), `RunMigrations` logs a warning and exits successfully instead of crashing the service.
- **Dirty state is fatal**: a dirty migration state is treated as an error.

## Process DB dependencies

- API (`cmd/api/main.go`) calls `db.WaitForSchema` before opening a pool.
- Indexer and Keeper also call `db.WaitForSchema` before starting loops.
- Migrator is the only process that runs `db.RunMigrations` directly.

## Schema overview (grouped)

The authoritative schema is defined by migrations under `apps/backend/migrations/*.sql`.

`apps/backend/sql/schema.sql` is a “mirror” used by SQLC generation and should reflect migrations (it may lag if not maintained).

### Ingestion / canonical event log

- `indexer_state`: last indexed block, last header hash, timestamp, reorg depth.
- `chain_events`: canonical decoded chain events (unique by `(tx_hash, log_index)`).

### Projections / read models

These are derived from `chain_events` by the indexer and used for fast API reads:

- `templates`, `ledgers`, `epochs`
- `market_epoch_outcomes`, `market_snapshots`, `market_read_models`
- `probability_points`: compact time series snapshots for charting
- `user_position_outcomes`: per-user projection of stakes/claims

### Realtime stream durability

- `realtime_events`: durable stream of envelopes with monotonic `seq`.

### Automation / operations

- `keeper_schedule`: due jobs with claim and retry semantics
- `keeper_executions`: execution history (tx hash, receipt, preflight snapshot, error)
- `incidents`: operator-visible incident log (indexer reorg, keeper misses, etc.)

### Funding (abstraction layer)

Funding flows are backed by multiple tables created across migrations `000005`–`000007`:

- intents + route options + executions
- destination USDC transfer detection
- balance ledger and user balances (crediting)
- transition guards and webhook event tables

The easiest way to understand these is via the code paths in:

- `apps/backend/internal/api/funding_abstraction.go`
- `apps/backend/internal/funding/*`

## Database pool notes

`internal/db/pool.go` contains a special case for Supabase transaction pooler:

- If `DATABASE_URL` contains `pooler.supabase.com:6543`, pgx is forced to `QueryExecModeExec` to avoid prepared-statement caching issues with PgBouncer.

## Source pointers

- Migrations: `apps/backend/migrations/*.sql`
- Embedding: `apps/backend/migrations/embed.go`
- Runner/wait: `apps/backend/internal/db/migrate.go`
- Pool configuration: `apps/backend/internal/db/pool.go`

