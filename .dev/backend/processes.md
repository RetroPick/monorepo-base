# Backend processes

This doc describes the backend executables in `apps/backend/cmd/*` and how they compose at runtime.

## Process inventory (current)

- **API**: `apps/backend/cmd/api/main.go`
  - Listens on `PORT` (default **8080**).
  - Exposes:
    - HTTP API (`/api/v1/*`, `/api/*`)
    - websocket endpoint: `/ws`
    - health: `/api/v1/livez`, `/api/v1/readyz`, `/api/v1/health`
    - a basic Prometheus-text endpoint: `/metrics` (API-local)
  - Starts background goroutines:
    - funding workers: credit worker, matcher worker, destination poller
    - Postgres LISTEN bridge: `internal/pglisten.Run(...)`

- **Indexer**: `apps/backend/cmd/indexer/main.go`
  - Tick loop calling `indexer.Service.SyncOnce`.
  - Optional Prometheus-text metrics server via `METRICS_PORT` (bind defaults to `127.0.0.1`).

- **Keeper**: `apps/backend/cmd/keeper/main.go`
  - Disabled by default; enable via `KEEPER_ENABLED=1`.
  - Polls for due jobs in `keeper_schedule`, claims them, preflights, executes, writes `keeper_executions`, updates schedule status, and inserts `incidents` on failure/window miss.
  - Optional Prometheus-text metrics server via `METRICS_PORT`.

- **Migrator**: `apps/backend/cmd/migrator/main.go`
  - Applies embedded migrations and exits.
  - Intended to be run in CI/deploy hooks or as a one-shot init job.

## Typical deployment topology

For a persistent backend (recommended per `PRODUCTION.md`), run:

- `retropick-api` (API) as a long-lived service
- `retropick-indexer` (Indexer) as a long-lived service
- `retropick-keeper` (Keeper) as a long-lived service (only if you want automation)
- Postgres as a long-lived service
- `retropick-migrator` as one-shot during deploy

## Startup order (practical)

1. **Postgres up**
2. **Migrator** runs to completion (or API runs migrations, depending on your chosen pattern)
3. **API** starts (and waits for schema with `db.WaitForSchema`)
4. **Indexer** starts (also waits for schema)
5. **Keeper** starts (waits for schema, requires signer configured)

## Shutdown behavior

- API/indexer/keeper all use `signal.NotifyContext` for `SIGINT`/`SIGTERM`.
- API shuts down HTTP server with a 10s timeout (`http.Server.Shutdown`) and relies on `ctx.Done()` for goroutine exits.
- Indexer and keeper loops exit on context cancel.

## Metrics behavior

There are **two** metrics surfaces:

- **API** exposes `/metrics` from `internal/api/health.go`. This endpoint includes backend counters derived from DB queries (templates, incidents, indexer last block). It is on the main API port.
- **Indexer/Keeper** can also expose a standalone Prometheus-text endpoint if `METRICS_PORT` is set, implemented in `internal/metrics/metrics.go`.
  - Bind host is `METRICS_HOST` (default `127.0.0.1`).
  - This is meant for local scraping or node-local Prometheus, not public exposure.

## Source pointers

- `apps/backend/cmd/api/main.go`
- `apps/backend/cmd/indexer/main.go`
- `apps/backend/cmd/keeper/main.go`
- `apps/backend/cmd/migrator/main.go`
- `apps/backend/internal/api/health.go`
- `apps/backend/internal/metrics/metrics.go`

