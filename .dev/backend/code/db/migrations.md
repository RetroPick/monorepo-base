# DB migrations and schema readiness

This doc explains how `apps/backend` applies migrations and how other processes wait for schema readiness.

## Embedded migrations

- Files: `apps/backend/migrations/*.sql`\n- Embed FS: `apps/backend/migrations/embed.go` (`//go:embed *.sql`)

## Applying migrations (`db.RunMigrations`)

Source: `apps/backend/internal/db/migrate.go`

Key behaviors:\n\n- Uses `golang-migrate` with an `iofs` source.\n- Retries transient reachability errors with exponential backoff.\n- Global deadline: `waitSchemaTimeout = 5 minutes`.\n- If DB version is ahead of embedded max version, logs a warning and returns nil.\n- If DB is dirty, returns an error.

## Waiting for schema (`db.WaitForSchema`)

Other processes do **not** run migrations directly. They wait for schema:

- API (`cmd/api/main.go`)\n- Indexer (`cmd/indexer/main.go`)\n- Keeper (`cmd/keeper/main.go`)\n- Alert worker (`cmd/alert/main.go`)

`WaitForSchema`:\n\n- polls `SELECT version, dirty FROM schema_migrations LIMIT 1`\n- if table missing (`42P01`) or no rows, it keeps waiting\n- if dirty, keeps waiting\n- retries transient reachability errors\n- exits successfully once the row is present and not dirty

## Why this pattern exists

It supports:\n\n- Docker compose / WSL cold-starts where Postgres and backend start racing\n- one-shot migrator patterns\n- preventing indexer/keeper from running against partially migrated schema

## Source pointers

- `apps/backend/internal/db/migrate.go`\n- `apps/backend/internal/db/reachability.go`\n- `apps/backend/migrations/*.sql`\n- `apps/backend/cmd/migrator/main.go`

